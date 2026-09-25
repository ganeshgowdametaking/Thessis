-- Run only in a disposable PostgreSQL database named thessis_resume_storage_test:
--   createdb thessis_resume_storage_test
--   psql -v ON_ERROR_STOP=1 -d thessis_resume_storage_test -f supabase/tests/resume_storage_smoke.sql
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() <> 'thessis_resume_storage_test' THEN
    RAISE EXCEPTION 'This smoke test must run in thessis_resume_storage_test';
  END IF;
END $$;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION storage.foldername(object_name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(object_name, '/')
$$;
GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated;

CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects (bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON storage.objects TO anon, authenticated;

\ir ../migrations/20260904110000_resume_storage_bucket.sql
INSERT INTO storage.objects VALUES
  ('resumes', '11111111-1111-4111-8111-111111111111/resume.pdf');

SET ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects) <> 1 THEN
    RAISE EXCEPTION 'Test setup did not reproduce public resume reads';
  END IF;
END $$;
RESET ROLE;

\ir ../migrations/20260925120000_private_resume_storage.sql

DO $$
BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'resumes') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Resume bucket is still public';
  END IF;
END $$;

SET ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'Anonymous users can still read resumes';
  END IF;
END $$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects) <> 1 THEN
    RAISE EXCEPTION 'Applicant cannot read their own resume';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects) <> 0 THEN
    RAISE EXCEPTION 'Another user can read the applicant resume';
  END IF;
END $$;
RESET ROLE;

SELECT 'resume storage smoke test passed' AS result;
