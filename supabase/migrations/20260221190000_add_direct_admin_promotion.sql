-- Clean up the previous Slack trigger for admin invites (as requested)
DROP TRIGGER IF EXISTS on_admin_invite_created ON public.admin_invites;
DROP FUNCTION IF EXISTS public.handle_admin_invite_notification();
DROP FUNCTION IF EXISTS public.invite_admin_safely(text);

-- Create the RPC function to directly promote a user by email
CREATE OR REPLACE FUNCTION public.promote_user_to_admin_by_email(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role text;
  target_user_id uuid;
BEGIN
  -- 1. Check if the caller is an admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  IF caller_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Only administrators can promote other users.');
  END IF;

  -- 2. Find the target user ID by email
  SELECT id INTO target_user_id FROM public.profiles WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User with this email not found.');
  END IF;

  -- 3. Update the user's role to 'admin'
  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;
