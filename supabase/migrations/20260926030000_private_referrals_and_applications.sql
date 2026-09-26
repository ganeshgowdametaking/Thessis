-- Safe read models intentionally run with view-owner permissions. Every
-- column is explicit; private base tables keep RLS and are not applicant APIs.
CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier=true) AS
SELECT id,full_name,title,company,location,bio,avatar_url,cover_image_url,
 country_code,experiences,education,skills,achievements,verified,
 work_email_verified,secondary_email_verified,connections_count,created_at
FROM public.profiles WHERE auth.uid() IS NOT NULL;
REVOKE ALL ON public.public_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;

DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('profiles','jobs','applications','job_referrers','referral_assignments')
 AND cmd='SELECT' LOOP
  EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;
-- Preserve the existing role-gated administrator analytics screens. Ordinary
-- members lose broad reads; a confirmed account with the protected admin role
-- retains them. No email-address exception is used.
CREATE OR REPLACE FUNCTION public.is_site_administrator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE p.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND p.role='admin')
$$;
REVOKE ALL ON FUNCTION public.is_site_administrator() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_site_administrator() TO authenticated;
CREATE POLICY private_profile_read ON public.profiles FOR SELECT TO authenticated
USING(id=auth.uid());
CREATE POLICY administrator_profile_read ON public.profiles FOR SELECT TO authenticated
USING((SELECT public.is_site_administrator()));
CREATE POLICY job_owner_read ON public.jobs FOR SELECT TO authenticated USING(created_by=auth.uid());
CREATE POLICY administrator_job_read ON public.jobs FOR SELECT TO authenticated
USING((SELECT public.is_site_administrator()));
CREATE POLICY application_reviewer_read ON public.applications FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.created_by=auth.uid()));
CREATE POLICY administrator_application_read ON public.applications FOR SELECT TO authenticated
USING((SELECT public.is_site_administrator()));
CREATE POLICY referrer_owner_read ON public.job_referrers FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.created_by=auth.uid()));
CREATE POLICY assignment_owner_read ON public.referral_assignments FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.created_by=auth.uid()));

CREATE OR REPLACE VIEW public.referral_listings WITH (security_barrier=true) AS
SELECT id,title,company,department,location,job_type,description,skills,benefits,
 remote_available,urgent_hiring,experience_level,application_deadline,status,
 applications_count,views_count,created_at,updated_at,
 (created_by=auth.uid()) AS is_owner
FROM public.jobs WHERE auth.uid() IS NOT NULL;
REVOKE ALL ON public.referral_listings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.referral_listings TO authenticated;

CREATE OR REPLACE VIEW public.applicant_applications WITH (security_barrier=true) AS
SELECT a.id,a.job_id,a.applicant_id,a.status,a.applied_at,a.updated_at,a.shortlisted,
 jsonb_build_object('id',j.id,'title',j.title,'company',j.company,'location',j.location,'job_type',j.job_type) AS job
FROM public.applications a JOIN public.jobs j ON j.id=a.job_id
WHERE a.applicant_id=auth.uid();
REVOKE ALL ON public.applicant_applications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.applicant_applications TO authenticated;

REVOKE INSERT,UPDATE,DELETE ON public.applications FROM PUBLIC,anon,authenticated;
GRANT UPDATE(status,shortlisted,notes,rating) ON public.applications TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_application_decision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('shortlisted','referred') AND auth.uid() IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=NEW.job_id AND j.created_by=auth.uid()
   AND public.is_verified_employer(auth.uid(),j.company)) THEN
   RAISE EXCEPTION 'Only this job owner with a verified work email may make this decision' USING ERRCODE='42501'; END IF;
 END IF;
 IF NEW.status NOT IN ('submitted','pending','shortlisted','referred','rejected') THEN
  RAISE EXCEPTION 'Invalid application state'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_application_decision ON public.applications;
CREATE TRIGGER guard_application_decision BEFORE UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_decision();

CREATE OR REPLACE FUNCTION public.submit_application(p_job_id uuid,p_resume_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job public.jobs%ROWTYPE; v_id uuid; BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Sign in with a confirmed account to apply' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id FOR SHARE;
 IF v_job.id IS NULL OR v_job.status<>'active' OR v_job.created_by=auth.uid()
  OR (v_job.application_deadline IS NOT NULL AND v_job.application_deadline<now()) THEN
  RAISE EXCEPTION 'This role is not accepting your application'; END IF;
 IF NOT public.is_verified_employer(v_job.created_by,v_job.company) THEN
  RAISE EXCEPTION 'This referral is awaiting employee verification'; END IF;
 IF split_part(p_resume_path,'/',1)<>auth.uid()::text OR p_resume_path !~ '^[0-9a-f-]+/[0-9a-f-]+\.pdf$'
  OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='resumes' AND name=p_resume_path
   AND metadata->>'mimetype'='application/pdf' AND (metadata->>'size')::bigint<=5242880) THEN
  RAISE EXCEPTION 'Upload your PDF resume (up to 5 MB) before applying'; END IF;
 INSERT INTO public.applications(job_id,applicant_id,resume_url,status)
 VALUES(p_job_id,auth.uid(),p_resume_path,'pending') RETURNING id INTO v_id;
 -- Assignment is part of the same transaction; browser closure cannot skip it.
 PERFORM public.assign_next_referrer(v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_application(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_application(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_job_applications(p_job_id uuid,p_offset integer DEFAULT 0,p_limit integer DEFAULT 200)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=p_job_id AND created_by=auth.uid()) THEN
  RAISE EXCEPTION 'You may only review applicants for your own referrals' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT to_jsonb(a)||jsonb_build_object('user_profile',jsonb_build_object(
  'id',p.id,'full_name',p.full_name,'email',p.email,'avatar_url',p.avatar_url,
  'company',p.company,'title',p.title,'location',p.location,'bio',p.bio,
  'skills',p.skills,'experiences',p.experiences,'education',p.education,'achievements',p.achievements))
 FROM public.applications a JOIN public.profiles p ON p.id=a.applicant_id
 WHERE a.job_id=p_job_id ORDER BY a.applied_at DESC,a.id
 OFFSET greatest(p_offset,0) LIMIT least(greatest(p_limit,1),200);
END $$;
REVOKE ALL ON FUNCTION public.get_job_applications(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_job_applications(uuid,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_job_application(p_application_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job uuid; BEGIN
 SELECT a.job_id INTO v_job FROM public.applications a JOIN public.jobs j ON j.id=a.job_id
 WHERE a.id=p_application_id AND j.created_by=auth.uid() FOR UPDATE OF a;
 IF v_job IS NULL THEN RAISE EXCEPTION 'Application not found or permission denied' USING ERRCODE='42501'; END IF;
 DELETE FROM public.applications WHERE id=p_application_id;
 UPDATE public.jobs SET applications_count=(SELECT count(*) FROM public.applications WHERE job_id=v_job) WHERE id=v_job;
 DELETE FROM public.notifications WHERE metadata->>'applicationId'=p_application_id::text
  OR metadata->>'application_id'=p_application_id::text;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.remove_job_application(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_job_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_application_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job public.jobs%ROWTYPE; BEGIN
 SELECT * INTO v_job FROM public.jobs WHERE id=NEW.job_id;
 IF TG_OP='INSERT' THEN
  INSERT INTO public.notifications(user_id,type,title,message,actionable,priority,metadata)
  VALUES(v_job.created_by,'job_application','New Job Application',
   'A candidate applied for '||v_job.title||' at '||v_job.company,true,'high',
   jsonb_build_object('job_id',NEW.job_id,'application_id',NEW.id,'applicant_id',NEW.applicant_id));
 ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('shortlisted','rejected') THEN
  INSERT INTO public.notifications(user_id,type,title,message,actionable,priority,metadata)
  VALUES(NEW.applicant_id,'job','Application update',
   'Your application for '||v_job.title||' at '||v_job.company||' is '||NEW.status,false,'high',
   jsonb_build_object('job_id',NEW.job_id,'application_id',NEW.id));
 END IF;
 -- Referred notifications are already created by handle_application_status_email.
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_application_event() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS notify_application_event ON public.applications;
CREATE TRIGGER notify_application_event AFTER INSERT OR UPDATE OF status ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_event();

CREATE OR REPLACE FUNCTION public.get_referred_employee(p_application_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT j.created_by FROM public.applications a JOIN public.jobs j ON j.id=a.job_id
 WHERE a.id=p_application_id AND a.applicant_id=auth.uid() AND a.status='referred'
$$;
REVOKE ALL ON FUNCTION public.get_referred_employee(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_referred_employee(uuid) TO authenticated;

NOTIFY pgrst,'reload schema';
