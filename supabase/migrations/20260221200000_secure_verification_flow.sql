-- 1. Secure and Unique-enforced generate_verification_code function
CREATE OR REPLACE FUNCTION public.generate_verification_code(
  p_user_id UUID,
  p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Security: Only the user themselves can request a code
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Uniqueness Check: Ensure no other profile has ALREADY verified this email
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE work_email = p_email 
    AND work_email_verified = TRUE
    AND id <> p_user_id -- Allow the user to re-verify their own email if needed, but not others
  ) THEN
    RAISE EXCEPTION 'This organization email is already verified';
  END IF;

  -- Generate 6-digit code
  v_code := lpad((floor(random() * 1000000))::INT::TEXT, 6, '0');

  -- Invalidate old codes for this specific request
  UPDATE public.verification_codes
  SET expires_at = NOW()
  WHERE user_id = p_user_id
    AND email = p_email
    AND type = 'work_email'
    AND verified_at IS NULL;

  -- Insert new code
  INSERT INTO public.verification_codes (user_id, email, code, expires_at)
  VALUES (p_user_id, p_email, v_code, NOW() + INTERVAL '15 minutes');
END;
$$;

-- 2. Create the Resend Email Trigger for OTP Delivery
-- Note: Replace YOUR_RESEND_API_KEY with your actual Resend API Key
CREATE OR REPLACE FUNCTION public.handle_verification_code_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_RESEND_API_KEY',
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'Thessis <onboarding@resend.dev>',
        'to', ARRAY[new.email],
        'subject', 'Your Thessis Verification Code',
        'html', format('<p>Your Thessis verification code is: <strong>%s</strong></p><p>This code will expire in 15 minutes.</p>', new.code)
      )
    );
  RETURN new;
END;
$$;

-- 3. Bind the trigger
DROP TRIGGER IF EXISTS on_verification_code_created ON public.verification_codes;
CREATE TRIGGER on_verification_code_created
  AFTER INSERT ON public.verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_verification_code_email();

-- 4. Grant access
GRANT EXECUTE ON FUNCTION public.generate_verification_code(UUID, TEXT) TO authenticated;
