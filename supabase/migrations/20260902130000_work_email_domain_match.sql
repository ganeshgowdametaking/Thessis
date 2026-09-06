-- Work-email verification: require the entered email to actually match the
-- user's current employer, instead of accepting any address.
--
-- Three checks, in order, before a code is generated:
--   1. Reject generic personal email providers outright (gmail.com, etc.)
--   2. Require a current-role Experience entry to check against
--   3. Require the email's domain to plausibly match that entry's company
--      (normalized substring match — no external company/domain database)
--
-- All three raise a specific exception message, which the client already
-- surfaces as-is (trustService.startWorkEmailVerification -> handleSendVerificationCode
-- just displays error.message) — no client-side changes needed.

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
