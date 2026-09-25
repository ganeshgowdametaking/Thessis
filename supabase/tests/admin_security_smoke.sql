-- Run only in a disposable PostgreSQL database named thessis_admin_security_test:
--   createdb thessis_admin_security_test
--   psql -v ON_ERROR_STOP=1 -d thessis_admin_security_test -f supabase/tests/admin_security_smoke.sql
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() <> 'thessis_admin_security_test' THEN
    RAISE EXCEPTION 'This smoke test must run in thessis_admin_security_test';
  END IF;
END $$;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  email_confirmed_at timestamptz
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('email', current_setting('request.jwt.claim.email', true))
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated, service_role;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  bio text,
  verified boolean DEFAULT false,
  role text DEFAULT 'user',
  work_email text,
  work_email_verified boolean DEFAULT false,
  work_email_verified_at timestamptz,
  secondary_email text,
  secondary_email_verified boolean DEFAULT false,
  secondary_email_verified_at timestamptz,
  account_type text,
  tide_points_balance integer DEFAULT 0,
  connections_count integer DEFAULT 0,
  followers_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted boolean DEFAULT false,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_invites TO service_role;

INSERT INTO auth.users VALUES
  ('11111111-1111-4111-8111-111111111111', 'user@example.com', now()),
  ('22222222-2222-4222-8222-222222222222', 'admin@example.com', now()),
  ('33333333-3333-4333-8333-333333333333', 'target@example.com', now()),
  ('44444444-4444-4444-8444-444444444444', 'new@example.com', now()),
  ('55555555-5555-4555-8555-555555555555', 'ganeshgowdaapplication@gmail.com', now());
INSERT INTO public.profiles(id, email, full_name, role) VALUES
  ('11111111-1111-4111-8111-111111111111', 'user@example.com', 'User', 'user'),
  ('22222222-2222-4222-8222-222222222222', 'admin@example.com', 'Admin', 'admin'),
  ('33333333-3333-4333-8333-333333333333', 'target@example.com', 'Target', 'user'),
  ('55555555-5555-4555-8555-555555555555', 'ganeshgowdaapplication@gmail.com', 'Owner', 'user');

\ir ../migrations/20260925010000_secure_admin_access.sql

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
SELECT set_config('request.jwt.claim.email', 'user@example.com', false);
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET role = 'admin'
    WHERE id = '11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'A user changed their own role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.profiles SET work_email_verified = true
    WHERE id = '11111111-1111-4111-8111-111111111111';
    RAISE EXCEPTION 'A user changed their verification flag';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.profiles SET bio = 'hello'
  WHERE id = '11111111-1111-4111-8111-111111111111';
  IF (SELECT bio FROM public.profiles
      WHERE id = '11111111-1111-4111-8111-111111111111') <> 'hello' THEN
    RAISE EXCEPTION 'A normal profile edit failed';
  END IF;

  BEGIN
    INSERT INTO public.profiles(id, email, full_name, role)
    VALUES ('44444444-4444-4444-8444-444444444444', 'new@example.com', 'New', 'admin');
    RAISE EXCEPTION 'A user inserted an admin profile';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

DO $$
DECLARE result json;
BEGIN
  SELECT public.promote_user_to_admin_by_email('target@example.com') INTO result;
  IF result->>'success' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'A non-admin promoted another user';
  END IF;
  BEGIN
    PERFORM public.get_all_administrators();
    RAISE EXCEPTION 'A non-owner viewed the owner dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.demote_admin('22222222-2222-4222-8222-222222222222');
    RAISE EXCEPTION 'A non-owner demoted an admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
SELECT set_config('request.jwt.claim.email', 'admin@example.com', false);
DO $$
DECLARE result json;
BEGIN
  SELECT public.promote_user_to_admin_by_email('target@example.com') INTO result;
  IF result->>'success' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'A confirmed admin could not promote a user';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);
SELECT set_config('request.jwt.claim.email', 'ganeshgowdaapplication@gmail.com', false);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.get_all_administrators()) < 1 THEN
    RAISE EXCEPTION 'The confirmed owner could not view admins';
  END IF;
  BEGIN
    PERFORM public.demote_admin('55555555-5555-4555-8555-555555555555');
    RAISE EXCEPTION 'The owner self-demoted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.demote_admin('33333333-3333-4333-8333-333333333333');
  IF (SELECT role FROM public.profiles
      WHERE id = '33333333-3333-4333-8333-333333333333') <> 'user' THEN
    RAISE EXCEPTION 'The owner could not demote an admin';
  END IF;
END $$;

RESET ROLE;
INSERT INTO public.admin_invites(email, token, expires_at)
VALUES ('target@example.com', repeat('a', 64), now() + interval '1 day');

SET ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.accept_admin_invite_secure(
      repeat('a', 64), '33333333-3333-4333-8333-333333333333');
    RAISE EXCEPTION 'An authenticated user called the service-only invite RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SET ROLE service_role;
DO $$
BEGIN
  IF public.accept_admin_invite_secure(
    repeat('a', 64), '11111111-1111-4111-8111-111111111111') THEN
    RAISE EXCEPTION 'The wrong account accepted an invitation';
  END IF;
  IF NOT public.accept_admin_invite_secure(
    repeat('a', 64), '33333333-3333-4333-8333-333333333333') THEN
    RAISE EXCEPTION 'The invited account could not accept';
  END IF;
  IF public.accept_admin_invite_secure(
    repeat('a', 64), '33333333-3333-4333-8333-333333333333') THEN
    RAISE EXCEPTION 'An invitation was accepted twice';
  END IF;
END $$;

RESET ROLE;
SELECT 'admin security smoke test passed' AS result;
