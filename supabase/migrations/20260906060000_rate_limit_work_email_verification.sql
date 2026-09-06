-- Rate-limit work-email verification codes. generate_verification_code had
-- no limit at all on how often a user could request a new code — each call
-- inserts a new verification_codes row and (via existing downstream email
-- dispatch) sends a real email, so this was an open, authenticated
-- email-bombing vector: a compromised or malicious account could hammer
-- this endpoint and run up a real email-sending bill with no ceiling.
--
-- Two windows, both scoped to the requesting user:
--   - short window: max 3 codes per 10 minutes (stops rapid-fire spam)
--   - daily window: max 8 codes per 24 hours (stops slow-drip abuse that
--     stays under the short-window threshold)
-- Checked right before the code is actually created — after the existing
-- personal-email-provider / current-role / domain-match checks, so a
-- request that would fail for an unrelated reason doesn't consume a slot.

CREATE OR REPLACE FUNCTION public.generate_verification_code(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_domain TEXT;
  v_domain_root TEXT;
  v_current_company TEXT;
  v_normalized_company TEXT;
  v_matches BOOLEAN;
  v_recent_count INT;
  v_daily_count INT;
  v_personal_providers TEXT[] := ARRAY[
    'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com',
    'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'protonmail.com', 'proton.me', 'mail.com', 'gmx.com',
    'yandex.com', 'zoho.com'
  ];
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_domain := lower(split_part(p_email, '@', 2));

  -- 1. Personal email providers are never valid as a work email.
  IF v_domain = ANY(v_personal_providers) THEN
    RAISE EXCEPTION 'Please use your work email address, not a personal email provider.';
  END IF;

  -- 2. Need a current-role Experience entry to check the domain against.
  SELECT elem->>'company'
  INTO v_current_company
  FROM public.profiles p, jsonb_array_elements(p.experiences) AS elem
  WHERE p.id = p_user_id
    AND (elem->>'current')::boolean IS TRUE
  LIMIT 1;

  IF v_current_company IS NULL OR btrim(v_current_company) = '' THEN
    RAISE EXCEPTION 'Add your current role to the Experience section of your profile before verifying a work email.';
  END IF;

  -- 3. Normalized substring match between the domain's root label and the
  -- company name — strips legal suffixes and punctuation from the company
  -- name, then checks either contains the other.
  v_domain_root := split_part(v_domain, '.', 1);
  v_normalized_company := lower(v_current_company);
  v_normalized_company := regexp_replace(v_normalized_company, '\y(inc|llc|ltd|corp|corporation|co|gmbh|plc|sa|srl|pvt|pty|limited|company)\y\.?', '', 'gi');
  v_normalized_company := regexp_replace(v_normalized_company, '[^a-z0-9]', '', 'g');

  v_matches := v_domain_root <> '' AND v_normalized_company <> '' AND (
    position(v_domain_root in v_normalized_company) > 0
    OR position(v_normalized_company in v_domain_root) > 0
  );

  IF NOT v_matches THEN
    RAISE EXCEPTION 'This email domain doesn''t match your current employer (%) listed in your profile.', v_current_company;
  END IF;

  -- 4. Rate limit — checked last, right before a code (and its email) would
  -- actually be created.
  SELECT count(*) INTO v_recent_count
  FROM public.verification_codes
  WHERE user_id = p_user_id
    AND type = 'work_email'
    AND created_at > NOW() - INTERVAL '10 minutes';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Too many verification codes requested. Please wait a few minutes and try again.';
  END IF;

  SELECT count(*) INTO v_daily_count
  FROM public.verification_codes
  WHERE user_id = p_user_id
    AND type = 'work_email'
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_daily_count >= 8 THEN
    RAISE EXCEPTION 'Too many verification codes requested today. Please try again tomorrow.';
  END IF;

  v_code := lpad((floor(random() * 1000000))::INT::TEXT, 6, '0');

  UPDATE public.verification_codes
  SET expires_at = NOW()
  WHERE user_id = p_user_id
    AND email = p_email
    AND type = 'work_email'
    AND verified_at IS NULL;

  INSERT INTO public.verification_codes (user_id, email, code, expires_at)
  VALUES (p_user_id, p_email, v_code, NOW() + INTERVAL '15 minutes');

  RETURN v_code;
END;
$$;
