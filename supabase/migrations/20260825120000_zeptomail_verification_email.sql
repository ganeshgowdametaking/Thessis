-- Replaces the work-email verification trigger's email provider: Resend -> ZeptoMail.
--
-- The previous version of this function (20260221200000_secure_verification_flow.sql)
-- had a literal API key hardcoded in its SQL source (a real credential-hygiene bug,
-- confirmed still hand-patched into the live function today). This version instead
-- reads the token from Supabase Vault, so the credential never lives in a migration
-- file or in `pg_proc` source in plain text.
--
-- ONE-TIME SETUP REQUIRED before this function will actually send email — run this
-- once in the Supabase SQL editor, with your real ZeptoMail Send Mail Token:
--
--   select vault.create_secret('<your ZeptoMail send mail token>', 'zeptomail_api_token', 'ZeptoMail API token for transactional email');
--
-- If a secret with that name already exists (e.g. you're re-running this), update it
-- instead of creating a duplicate:
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'zeptomail_api_token'),
--     '<your new token>'
--   );

CREATE OR REPLACE FUNCTION public.handle_verification_code_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'zeptomail_api_token'
  LIMIT 1;

  IF v_token IS NULL THEN
    RAISE WARNING 'zeptomail_api_token secret not found in Vault — verification email not sent. Run vault.create_secret(...) to configure it.';
    RETURN new;
  END IF;

  PERFORM
    net.http_post(
      url := 'https://api.zeptomail.com/v1.1/email',
      headers := jsonb_build_object(
        'Authorization', 'Zoho-enczapikey ' || v_token,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', jsonb_build_object(
          'address', 'onboarding@yourdomain.com', -- TODO: replace with your ZeptoMail-verified sending address
          'name', 'Thessis'
        ),
        'to', jsonb_build_array(
          jsonb_build_object(
            'email_address', jsonb_build_object('address', new.email)
          )
        ),
        'subject', 'Your Thessis Verification Code',
        'htmlbody', format('<p>Your Thessis verification code is: <strong>%s</strong></p><p>This code will expire in 15 minutes.</p>', new.code)
      )
    );
  RETURN new;
END;
$$;

-- Trigger binding is unchanged (same trigger, same table) — CREATE OR REPLACE FUNCTION
-- above is sufficient, no need to re-bind on_verification_code_created.
