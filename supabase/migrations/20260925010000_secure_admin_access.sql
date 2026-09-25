-- Protect profile fields that grant access or represent server-verified facts.
-- RLS controls which row a user can edit; this trigger controls which values.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- SECURITY DEFINER functions and the service role can maintain these fields.
  -- Direct PostgREST writes run as authenticated (or anon).
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS DISTINCT FROM NEW.id
       OR lower(NEW.email) IS DISTINCT FROM lower(auth.jwt() ->> 'email')
       OR NEW.role IS DISTINCT FROM 'user'
       OR coalesce(NEW.verified, false)
       OR coalesce(NEW.work_email_verified, false)
       OR coalesce(NEW.secondary_email_verified, false)
       OR NEW.work_email_verified_at IS NOT NULL
       OR NEW.secondary_email_verified_at IS NOT NULL
       OR NEW.work_email IS NOT NULL
       OR NEW.account_type IS NOT NULL
       OR coalesce(NEW.tide_points_balance, 0) <> 0
       OR coalesce(NEW.connections_count, 0) <> 0
       OR coalesce(NEW.followers_count, 0) <> 0
       OR coalesce(NEW.posts_count, 0) <> 0
       OR coalesce(to_jsonb(NEW) -> 'response_metric', 'null'::jsonb)
          NOT IN ('null'::jsonb, '0'::jsonb) THEN
      RAISE EXCEPTION 'Profile privilege fields cannot be set by the user'
        USING ERRCODE = '42501';
    END IF;
    NEW.created_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.verified IS DISTINCT FROM OLD.verified
       OR NEW.work_email IS DISTINCT FROM OLD.work_email
       OR NEW.work_email_verified IS DISTINCT FROM OLD.work_email_verified
       OR NEW.work_email_verified_at IS DISTINCT FROM OLD.work_email_verified_at
       OR NEW.secondary_email IS DISTINCT FROM OLD.secondary_email
       OR NEW.secondary_email_verified IS DISTINCT FROM OLD.secondary_email_verified
       OR NEW.secondary_email_verified_at IS DISTINCT FROM OLD.secondary_email_verified_at
       OR NEW.account_type IS DISTINCT FROM OLD.account_type
       OR NEW.tide_points_balance IS DISTINCT FROM OLD.tide_points_balance
       OR NEW.connections_count IS DISTINCT FROM OLD.connections_count
       OR NEW.followers_count IS DISTINCT FROM OLD.followers_count
       OR NEW.posts_count IS DISTINCT FROM OLD.posts_count
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR to_jsonb(NEW) -> 'response_metric' IS DISTINCT FROM to_jsonb(OLD) -> 'response_metric' THEN
      RAISE EXCEPTION 'Profile privilege fields cannot be changed by the user'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Existing invitations stored the raw token. Revoke them before switching to
-- SHA-256 token hashes; newly emailed links must be issued by the updated Edge Function.
UPDATE public.admin_invites
SET expires_at = least(expires_at, now())
WHERE accepted = false;
COMMENT ON COLUMN public.admin_invites.token IS
  'SHA-256 hex digest of a 32-byte random invitation token; never store the emailed token.';

REVOKE ALL ON TABLE public.admin_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_invites TO service_role;

-- Admins may still use the existing Settings promotion action, but only a
-- confirmed account with an intact profile can initiate it.
CREATE OR REPLACE FUNCTION public.promote_user_to_admin_by_email(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_email text;
  v_caller_role text;
  v_target_id uuid;
BEGIN
  SELECT u.email, p.role
    INTO v_caller_email, v_caller_role
  FROM auth.users AS u
  JOIN public.profiles AS p ON p.id = u.id
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL
    AND lower(p.email) = lower(u.email);

  IF v_caller_email IS NULL OR
     (v_caller_role IS DISTINCT FROM 'admin' AND
      lower(v_caller_email) <> 'ganeshgowdaapplication@gmail.com') THEN
    RETURN json_build_object('success', false, 'error', 'Administrator access required.');
  END IF;

  IF user_email IS NULL OR length(trim(user_email)) > 254 THEN
    RETURN json_build_object('success', false, 'error', 'A valid email is required.');
  END IF;

  SELECT u.id INTO v_target_id
  FROM auth.users AS u
  JOIN public.profiles AS p ON p.id = u.id
  WHERE lower(u.email) = lower(trim(user_email))
    AND lower(p.email) = lower(u.email)
    AND u.email_confirmed_at IS NOT NULL;

  IF v_target_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Confirmed user not found.');
  END IF;

  UPDATE public.profiles SET role = 'admin' WHERE id = v_target_id;
  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.promote_user_to_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) TO authenticated;

-- The owner dashboard previously trusted the JWT email alone. Tie its access
-- to a confirmed Auth account and the matching protected profile email.
CREATE OR REPLACE FUNCTION public.get_all_administrators()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz,
  work_email text,
  work_email_verified boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    JOIN public.profiles AS p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = 'ganeshgowdaapplication@gmail.com'
      AND lower(p.email) = lower(u.email)
  ) THEN
    RAISE EXCEPTION 'Super User access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.role, p.created_at,
         p.work_email, p.work_email_verified
  FROM public.profiles AS p
  WHERE p.role = 'admin'
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_administrators() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_administrators() TO authenticated;

CREATE OR REPLACE FUNCTION public.demote_admin(admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    JOIN public.profiles AS p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = 'ganeshgowdaapplication@gmail.com'
      AND lower(p.email) = lower(u.email)
  ) THEN
    RAISE EXCEPTION 'Super User access required' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE u.id = admin_id
      AND lower(u.email) = 'ganeshgowdaapplication@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Super User cannot self-demote' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET role = 'user' WHERE id = admin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.demote_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demote_admin(uuid) TO authenticated;

-- The service-role Edge Function calls this after authenticating the invitee.
-- Row locking makes a token single-use even if two requests arrive together.
CREATE OR REPLACE FUNCTION public.accept_admin_invite_secure(
  p_token_hash text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.admin_invites%ROWTYPE;
  v_user_email text;
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_invite
  FROM public.admin_invites
  WHERE token = p_token_hash
    AND accepted = false
  FOR UPDATE;

  IF v_invite.id IS NULL OR v_invite.expires_at <= now() THEN
    RETURN false;
  END IF;

  SELECT u.email INTO v_user_email
  FROM auth.users AS u
  JOIN public.profiles AS p ON p.id = u.id
  WHERE u.id = p_user_id
    AND u.email_confirmed_at IS NOT NULL
    AND lower(p.email) = lower(u.email);

  IF v_user_email IS NULL OR lower(v_user_email) <> lower(v_invite.email) THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET role = 'admin' WHERE id = p_user_id;
  UPDATE public.admin_invites
  SET accepted = true, accepted_at = now(), updated_at = now()
  WHERE id = v_invite.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_admin_invite_secure(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_admin_invite_secure(text, uuid)
  TO service_role;
