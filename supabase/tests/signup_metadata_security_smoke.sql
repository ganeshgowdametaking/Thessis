-- Run with psql -v ON_ERROR_STOP=1 against a Supabase test database.
-- The rollback also discards transactional email queue entries.
BEGIN;

INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at)
VALUES ('92792700-0000-4000-8000-000000000001','rollback-927@example.invalid',
 '{"full_name":"Rollback probe","role":"admin","verified":true}',now());
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='92792700-0000-4000-8000-000000000001' AND role='user' AND verified=false AND full_name='Rollback probe') THEN
  RAISE EXCEPTION 'Signup metadata privilege regression';
 END IF;
END $$;

ROLLBACK;
