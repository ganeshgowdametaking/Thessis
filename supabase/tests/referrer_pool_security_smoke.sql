-- Run in a disposable local database named thessis_referrer_pool_test:
--   createdb thessis_referrer_pool_test
--   psql -v ON_ERROR_STOP=1 -d thessis_referrer_pool_test \
--     -f supabase/tests/referrer_pool_security_smoke.sql
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() <> 'thessis_referrer_pool_test' THEN
    RAISE EXCEPTION 'This smoke test must run in thessis_referrer_pool_test';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  email_confirmed_at timestamptz
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  title text,
  company text,
  location text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active',
  company text NOT NULL DEFAULT 'Example',
  title text NOT NULL DEFAULT 'Engineer',
  description text NOT NULL DEFAULT 'Role description',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.applications (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  applicant_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_referrer_id uuid,
  assignment_expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  resume_url text,
  ai_score numeric,
  ai_semantic_score numeric,
  ai_skill_score numeric,
  ai_rationale text,
  ai_ranked_at timestamptz
);
CREATE TABLE public.job_referrers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, employee_id)
);
CREATE TABLE public.referral_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  outcome text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz
);
CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz
);

ALTER TABLE public.job_referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all jobs"
  ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create jobs"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
CREATE POLICY "Employees can join a job's referrer pool"
  ON public.job_referrers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Employees can update their own referrer status"
  ON public.job_referrers FOR UPDATE TO authenticated
  USING (auth.uid() = employee_id);
CREATE POLICY "Assigned referrers can view current applications"
  ON public.applications FOR SELECT TO authenticated
  USING (assigned_referrer_id = auth.uid() AND assignment_expires_at > now());
CREATE POLICY "Users can insert their own verification codes"
  ON public.verification_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read their own verification codes"
  ON public.verification_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.job_referrers TO authenticated;
GRANT SELECT ON public.applications TO authenticated;
GRANT SELECT, INSERT ON public.verification_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.jobs TO authenticated;

CREATE FUNCTION public.normalize_company_name(p_company text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(coalesce(p_company, '')), '[^a-z0-9]', '', 'g')
$$;

CREATE FUNCTION public.join_job_as_referrer(p_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.job_referrers(job_id, employee_id)
  VALUES (p_job_id, auth.uid());
END $$;
CREATE FUNCTION public.assign_next_referrer(p_application_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
CREATE FUNCTION public.generate_verification_code(p_user_id uuid, p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.verification_codes(user_id, email, code, expires_at)
  VALUES (p_user_id, p_email, '123456', now() + interval '15 minutes');
  RETURN '123456';
END $$;
GRANT EXECUTE ON FUNCTION public.join_job_as_referrer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_verification_code(uuid, text) TO authenticated;

CREATE FUNCTION public.render_email_button(text, text)
RETURNS text LANGUAGE sql AS $$ SELECT ''::text $$;
CREATE FUNCTION public.render_email_shell(text, text)
RETURNS text LANGUAGE sql AS $$ SELECT ''::text $$;
CREATE FUNCTION public.send_transactional_email(text, text, text, text)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;

INSERT INTO auth.users VALUES
  ('11111111-1111-4111-8111-111111111111', 'owner@example.com', now()),
  ('22222222-2222-4222-8222-222222222222', 'attacker@example.com', now()),
  ('33333333-3333-4333-8333-333333333333', 'applicant@example.com', now());
INSERT INTO public.profiles(id, email, full_name) VALUES
  ('11111111-1111-4111-8111-111111111111', 'owner@example.com', 'Owner'),
  ('22222222-2222-4222-8222-222222222222', 'attacker@example.com', 'Attacker'),
  ('33333333-3333-4333-8333-333333333333', 'applicant@example.com', 'Applicant');
INSERT INTO public.jobs(id, created_by, company) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Example');
INSERT INTO public.applications(
  id, job_id, applicant_id, assigned_referrer_id, assignment_expires_at, resume_url
) VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '33333333-3333-4333-8333-333333333333',
   '22222222-2222-4222-8222-222222222222',
   now() + interval '1 day',
   '33333333-3333-4333-8333-333333333333/resume.pdf');
-- Simulate a legacy unapproved pool member and an unconsumed OTP.
INSERT INTO public.job_referrers(job_id, employee_id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '22222222-2222-4222-8222-222222222222');
INSERT INTO public.verification_codes(user_id, email, code, expires_at) VALUES
  ('22222222-2222-4222-8222-222222222222',
   'attacker@example.com', '654321', now() + interval '15 minutes');

-- Apply both final authorization migrations in their real filename order.
\ir ../migrations/20260925110000_authorize_resume_ranking.sql
\ir ../migrations/20260925130000_secure_referrer_pool_and_work_email_codes.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222', false);
DO $$
BEGIN
  BEGIN
    PERFORM public.join_job_as_referrer(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE EXCEPTION 'A nonowner joined a job pool';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.accept_referral_assignment(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'A legacy nonowner accepted an assignment';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.reject_referral_assignment(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'A legacy nonowner rejected an assignment';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.job_referrers(job_id, employee_id)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            '22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'A nonowner inserted a pool row directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.job_referrers SET status = 'active'
    WHERE employee_id = '22222222-2222-4222-8222-222222222222';
    RAISE EXCEPTION 'A nonowner updated a pool row directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT count(*) FROM public.applications) <> 0 THEN
    RAISE EXCEPTION 'An old assignment policy still exposed applications';
  END IF;
  IF public.find_canonical_job('Example', 'Engineer') IS NOT NULL THEN
    RAISE EXCEPTION 'A nonowner found another user''s joinable job';
  END IF;
  UPDATE public.jobs
  SET created_by = '22222222-2222-4222-8222-222222222222'
  WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF (SELECT created_by FROM public.jobs
      WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      <> '11111111-1111-4111-8111-111111111111' THEN
    RAISE EXCEPTION 'A nonowner took ownership of a job';
  END IF;
  IF public.generate_verification_code(
       '22222222-2222-4222-8222-222222222222', 'attacker@example.com') <> 'sent' THEN
    RAISE EXCEPTION 'The verification RPC disclosed a code';
  END IF;
  IF has_table_privilege('authenticated', 'public.verification_codes', 'SELECT')
     OR has_table_privilege('authenticated', 'public.verification_codes', 'INSERT')
     OR has_function_privilege('authenticated',
          'public.generate_verification_code_internal(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'A user still has access to verification code data';
  END IF;
END $$;

-- A second person's identical posting is allowed and remains theirs alone.
INSERT INTO public.jobs(id, created_by, company, title)
VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        '22222222-2222-4222-8222-222222222222', 'Example', 'Engineer');
DO $$
BEGIN
  IF public.find_canonical_job('Example', 'Engineer') IS DISTINCT FROM
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc' THEN
    RAISE EXCEPTION 'A user could not find their own matching referral';
  END IF;
  BEGIN
    UPDATE public.jobs
    SET created_by = '11111111-1111-4111-8111-111111111111'
    WHERE id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    RAISE EXCEPTION 'A user transferred job ownership';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT public.join_job_as_referrer(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc');

SELECT set_config('request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111', false);
SELECT public.join_job_as_referrer(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
RESET ROLE;

DO $$
DECLARE v_assigned uuid;
BEGIN
  IF (SELECT count(*) FROM public.get_application_for_ranking(
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        '22222222-2222-4222-8222-222222222222')) <> 0 THEN
    RAISE EXCEPTION 'A legacy assigned nonowner read ranking inputs';
  END IF;
  IF public.save_application_ranking(
       'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
       '22222222-2222-4222-8222-222222222222',
       80, 80, 80, 'x') THEN
    RAISE EXCEPTION 'A legacy assigned nonowner wrote a ranking';
  END IF;
  SELECT public.assign_next_referrer(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') INTO v_assigned;
  IF v_assigned IS DISTINCT FROM '11111111-1111-4111-8111-111111111111' THEN
    RAISE EXCEPTION 'A legacy nonowner received an applicant';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.verification_codes
    WHERE code = '654321' AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Old exposed verification codes were not expired';
  END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111', false);
SELECT public.accept_referral_assignment(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
RESET ROLE;
DO $$
BEGIN
  IF (SELECT status FROM public.applications
      WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'referred' THEN
    RAISE EXCEPTION 'The authorized owner could not accept an assignment';
  END IF;
END $$;

SELECT 'referrer pool security smoke test passed' AS result;
