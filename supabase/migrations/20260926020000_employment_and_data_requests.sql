-- Domains must be approved explicitly, never inferred from substrings.
CREATE TABLE IF NOT EXISTS public.employer_domains (
 company_key text NOT NULL,
 domain text NOT NULL CHECK (domain=lower(domain) AND domain !~ '[/@[:space:]]'),
 PRIMARY KEY(company_key,domain)
);
ALTER TABLE public.employer_domains ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employer_domains FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.employer_domains TO service_role;
-- Conservative exact matches; administrators can add reviewed employers via
-- SQL/Table Editor. Possessing mail at a lookalike subdomain does not qualify.
INSERT INTO public.employer_domains VALUES
 ('google','google.com'),('microsoft','microsoft.com'),('deel','deel.com'),
 ('zomato','zomato.com'),('capgemini','capgemini.com'),('wipro','wipro.com'),
 ('nielseniq','nielseniq.com'),('nielseniq','niq.com'),('marketstar','marketstar.com'),
 ('thessis','thessis.com') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.employer_email_matches(p_company text,p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_email ~ '^[^@[:space:]]+@[^@[:space:]]+$' AND EXISTS (
  SELECT 1 FROM public.employer_domains d
  WHERE d.company_key=public.normalize_company_name(p_company)
   AND d.domain=lower(split_part(btrim(p_email),'@',2)))
$$;
REVOKE ALL ON FUNCTION public.employer_email_matches(text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.is_verified_employer(p_user uuid,p_company text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE p.id=p_user AND p.work_email_verified AND u.email_confirmed_at IS NOT NULL
   AND public.employer_email_matches(p_company,p.work_email))
$$;
REVOKE ALL ON FUNCTION public.is_verified_employer(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.require_verified_employer() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND (TG_OP='INSERT' OR NEW.status='active')
   AND NOT public.is_verified_employer(NEW.created_by,NEW.company) THEN
  RAISE EXCEPTION 'Verify your work email for this employer before publishing a referral' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS require_verified_employer ON public.jobs;
CREATE TRIGGER require_verified_employer BEFORE INSERT OR UPDATE OF created_by,company,status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.require_verified_employer();

CREATE OR REPLACE FUNCTION public.join_job_as_referrer(p_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=p_job_id AND j.created_by=auth.uid()
  AND j.status='active' AND public.is_verified_employer(auth.uid(),j.company)) THEN
  RAISE EXCEPTION 'Only the verified employee who posted this job may refer applicants' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.job_referrers(job_id,employee_id,status) VALUES(p_job_id,auth.uid(),'active')
 ON CONFLICT(job_id,employee_id) DO UPDATE SET status='active';
END $$;
REVOKE ALL ON FUNCTION public.join_job_as_referrer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.join_job_as_referrer(uuid) TO authenticated;

ALTER TABLE public.verification_codes ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.generate_verification_code_internal(p_user_id uuid,p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_company text; v_code text; BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'Sign in to verify your work email' USING ERRCODE='42501'; END IF;
 -- Serialize requests so concurrent calls cannot bypass the send quota.
 PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 SELECT e->>'company' INTO v_company FROM public.profiles p,
  jsonb_array_elements(coalesce(p.experiences,'[]'::jsonb)) e
  WHERE p.id=p_user_id AND e->>'current'='true' LIMIT 1;
 IF NOT coalesce(public.employer_email_matches(v_company,p_email),false) THEN
  RAISE EXCEPTION 'Use an approved work email for your current employer. Contact support if your employer is not listed.';
 END IF;
 IF (SELECT count(*) FROM public.verification_codes WHERE user_id=p_user_id
  AND created_at>now()-interval '10 minutes')>=3 OR
  (SELECT count(*) FROM public.verification_codes WHERE user_id=p_user_id
  AND created_at>now()-interval '1 day')>=8 THEN
  RAISE EXCEPTION 'Too many codes requested. Please try again later.'; END IF;
 v_code:=lpad(((('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint)%1000000)::text,6,'0');
 UPDATE public.verification_codes SET expires_at=now() WHERE user_id=p_user_id AND verified_at IS NULL;
 INSERT INTO public.verification_codes(user_id,email,code,type,expires_at)
 VALUES(p_user_id,lower(btrim(p_email)),v_code,'work_email',now()+interval '10 minutes');
 RETURN v_code;
END $$;
REVOKE ALL ON FUNCTION public.generate_verification_code_internal(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.verify_work_email(p_user_id uuid,p_email text,p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.verification_codes%ROWTYPE; v_company text; BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 SELECT * INTO v_row FROM public.verification_codes WHERE user_id=p_user_id
  AND email=lower(btrim(p_email)) AND type='work_email' AND verified_at IS NULL
  AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF v_row.id IS NULL OR v_row.failed_attempts>=5 THEN RETURN false; END IF;
 IF v_row.code IS DISTINCT FROM p_code THEN
  UPDATE public.verification_codes SET failed_attempts=failed_attempts+1 WHERE id=v_row.id;
  RETURN false; END IF;
 SELECT e->>'company' INTO v_company FROM public.profiles p,
  jsonb_array_elements(coalesce(p.experiences,'[]'::jsonb)) e
  WHERE p.id=p_user_id AND e->>'current'='true' LIMIT 1;
 IF NOT coalesce(public.employer_email_matches(v_company,p_email),false) THEN RETURN false; END IF;
 UPDATE public.verification_codes SET verified_at=now(),expires_at=now() WHERE id=v_row.id;
 UPDATE public.profiles SET work_email=lower(btrim(p_email)),work_email_verified=true,
  work_email_verified_at=now() WHERE id=p_user_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.verify_work_email(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_work_email(uuid,text,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.data_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_type text NOT NULL CHECK(request_type IN ('access','delete','correct')),
 details text NOT NULL CHECK(length(btrim(details)) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','in_progress','completed','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 resolution text
);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.data_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.data_requests TO authenticated;
GRANT ALL ON public.data_requests TO service_role;
CREATE POLICY data_request_owner_read ON public.data_requests FOR SELECT TO authenticated
USING(user_id=auth.uid());
CREATE INDEX IF NOT EXISTS data_requests_queue ON public.data_requests(status,created_at);

CREATE OR REPLACE FUNCTION public.submit_data_request(p_type text,p_details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Sign in with a confirmed account to submit a data request' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM auth.users WHERE id=auth.uid() FOR UPDATE;
 IF (SELECT count(*) FROM public.data_requests WHERE user_id=auth.uid()
  AND created_at>now()-interval '1 day')>=5 THEN RAISE EXCEPTION 'Please wait before submitting another request'; END IF;
 INSERT INTO public.data_requests(user_id,request_type,details) VALUES(auth.uid(),p_type,btrim(p_details)) RETURNING id INTO v_id;
 INSERT INTO public.notifications(user_id,type,title,message,actionable,priority,metadata)
 SELECT p.id,'data_request','New data request','Review the request in the secure data request queue.',false,'high',
  jsonb_build_object('requestId',v_id)
 FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE u.email_confirmed_at IS NOT NULL
 AND p.role='admin';
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_data_request(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_data_request(text,text) TO authenticated;

NOTIFY pgrst,'reload schema';
