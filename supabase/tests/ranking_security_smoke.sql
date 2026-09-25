-- Run only in a disposable PostgreSQL database named thessis_ranking_security_test:
--   createdb thessis_ranking_security_test
--   psql -v ON_ERROR_STOP=1 -d thessis_ranking_security_test -f supabase/tests/ranking_security_smoke.sql
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() <> 'thessis_ranking_security_test' THEN
    RAISE EXCEPTION 'This smoke test must run in thessis_ranking_security_test';
  END IF;
END $$;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
ALTER ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  title text,
  company text,
  location text,
  skills jsonb
);
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY,
  title text,
  description text,
  created_by uuid NOT NULL
);
CREATE TABLE public.applications (
  id uuid PRIMARY KEY,
  applicant_id uuid NOT NULL,
  job_id uuid NOT NULL,
  resume_url text,
  assigned_referrer_id uuid,
  assignment_expires_at timestamptz,
  status text,
  ai_score numeric,
  ai_semantic_score numeric,
  ai_skill_score numeric,
  ai_rationale text,
  ai_ranked_at timestamptz
);
CREATE TABLE public.referral_assignments (
  application_id uuid,
  employee_id uuid,
  outcome text,
  resolved_at timestamptz
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.applications TO service_role;

INSERT INTO public.profiles VALUES
  ('11111111-1111-4111-8111-111111111111', 'Candidate', 'candidate@example.com', 'Engineer', 'Example', 'London', '["Python"]'),
  ('22222222-2222-4222-8222-222222222222', 'Owner', 'owner@example.com', NULL, NULL, NULL, NULL),
  ('33333333-3333-4333-8333-333333333333', 'Referrer', 'referrer@example.com', NULL, NULL, NULL, NULL);
INSERT INTO public.jobs VALUES (
  '44444444-4444-4444-8444-444444444444', 'Engineer', 'Build software',
  '22222222-2222-4222-8222-222222222222'
);
INSERT INTO public.applications (
  id, applicant_id, job_id, resume_url, assigned_referrer_id, assignment_expires_at, status
) VALUES (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111/resume.pdf',
  '33333333-3333-4333-8333-333333333333',
  now() + interval '1 hour',
  'pending'
);
INSERT INTO public.referral_assignments VALUES (
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  'pending', NULL
);

\ir ../migrations/20260925110000_authorize_resume_ranking.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
DO $$
BEGIN
  BEGIN
    PERFORM public.get_application_for_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333');
    RAISE EXCEPTION 'Browser role called the service-only ranking RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

SET ROLE service_role;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.get_application_for_ranking(
      '55555555-5555-4555-8555-555555555555',
      '99999999-9999-4999-8999-999999999999')) <> 0 THEN
    RAISE EXCEPTION 'An unrelated user could read ranking inputs';
  END IF;
  IF (SELECT count(*) FROM public.get_application_for_ranking(
      '55555555-5555-4555-8555-555555555555',
      '22222222-2222-4222-8222-222222222222')) <> 1 THEN
    RAISE EXCEPTION 'Job creator could not read ranking inputs';
  END IF;
  IF (SELECT count(*) FROM public.get_application_for_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333')) <> 0 THEN
    RAISE EXCEPTION 'Unapproved assigned referrer could read ranking inputs';
  END IF;
  IF public.save_application_ranking(
      '55555555-5555-4555-8555-555555555555',
      '99999999-9999-4999-8999-999999999999', 80, 80, 80, 'unauthorized') THEN
    RAISE EXCEPTION 'An unrelated user saved a ranking';
  END IF;
  IF public.save_application_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333', 80, 80, 80, 'unapproved') THEN
    RAISE EXCEPTION 'Unapproved assigned referrer saved a ranking';
  END IF;
  IF NOT public.save_application_ranking(
      '55555555-5555-4555-8555-555555555555',
      '22222222-2222-4222-8222-222222222222', 80, 80, 80, 'owner') THEN
    RAISE EXCEPTION 'Job creator could not save a ranking';
  END IF;
END $$;
RESET ROLE;

-- A legacy nonowner assignment cannot change application state.
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.accept_referral_assignment('55555555-5555-4555-8555-555555555555');
    RAISE EXCEPTION 'Unapproved referrer accepted an assignment' USING ERRCODE = 'P0002';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- A current assignment to the job creator can be accepted normally.
UPDATE public.applications
SET assigned_referrer_id = '22222222-2222-4222-8222-222222222222';
INSERT INTO public.referral_assignments VALUES (
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  'pending', NULL
);
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
SELECT public.accept_referral_assignment('55555555-5555-4555-8555-555555555555');
RESET ROLE;
SET ROLE service_role;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.get_application_for_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333')) <> 0 THEN
    RAISE EXCEPTION 'Accepted unapproved referrer could read ranking inputs';
  END IF;
  IF public.save_application_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333', 82, 82, 82, 'accepted') THEN
    RAISE EXCEPTION 'Accepted unapproved referrer saved a ranking';
  END IF;
  IF (SELECT status FROM public.applications
      WHERE id = '55555555-5555-4555-8555-555555555555') <> 'referred' THEN
    RAISE EXCEPTION 'The job creator could not accept the referral';
  END IF;
END $$;
RESET ROLE;

UPDATE public.applications
SET status = 'pending', assignment_expires_at = now() - interval '1 minute';
SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.accept_referral_assignment('55555555-5555-4555-8555-555555555555');
    RAISE EXCEPTION 'Expired assignment was accepted' USING ERRCODE = 'P0002';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET ROLE service_role;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.get_application_for_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333')) <> 0 THEN
    RAISE EXCEPTION 'Expired referrer could still read ranking inputs';
  END IF;
  IF public.save_application_ranking(
      '55555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333', 90, 90, 90, 'expired') THEN
    RAISE EXCEPTION 'Expired referrer saved a ranking';
  END IF;
END $$;
RESET ROLE;

SELECT 'ranking security smoke test passed' AS result;
