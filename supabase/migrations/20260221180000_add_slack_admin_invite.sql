-- Create a function to generate a secure random token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Create the RPC function to invite an admin
CREATE OR REPLACE FUNCTION public.invite_admin_safely(email_to_invite text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role text;
  new_token text;
  invite_link text;
  expires_at_val timestamptz;
BEGIN
  -- 1. Check if the caller is an admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  IF caller_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Only administrators can invite other administrators.');
  END IF;

  -- 2. Generate token and expiry (7 days)
  new_token := public.generate_invite_token();
  expires_at_val := now() + interval '7 days';

  -- 3. Insert into admin_invites (using service role privileges internally)
  INSERT INTO public.admin_invites (email, token, expires_at)
  VALUES (email_to_invite, new_token, expires_at_val);

  RETURN json_build_object('success', true, 'token', new_token);
END;
$$;

-- Create the Trigger Function for Slack Notification
CREATE OR REPLACE FUNCTION public.handle_admin_invite_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://hooks.slack.com/services/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',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'text', format('🔑 *New Admin Invitation Created*
*Email:* %s
*Token:* `%s`
*Expires At:* %s
*Link:* https://tanktide.com/auth/signup?invite=%s', 
                 new.email, 
                 new.token, 
                 new.expires_at,
                 new.token)
      )
    );
  RETURN new;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_admin_invite_created ON public.admin_invites;
CREATE TRIGGER on_admin_invite_created
  AFTER INSERT ON public.admin_invites
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_invite_notification();
