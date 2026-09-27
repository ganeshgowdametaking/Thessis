-- Signup metadata is controlled by the caller. Privileges must be server-owned.
-- Preserve profile/UTM initialization and all existing account roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    verified,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'user',
    false,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'utm_source', ''), 'Organic'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''), 'Direct'),
    NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_content', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_term', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    utm_source = CASE
      WHEN public.profiles.utm_source = 'Organic' OR public.profiles.utm_source IS NULL
      THEN COALESCE(NULLIF(NEW.raw_user_meta_data->>'utm_source', ''), public.profiles.utm_source, 'Organic')
      ELSE public.profiles.utm_source
    END,
    utm_medium = CASE
      WHEN public.profiles.utm_medium = 'Direct' OR public.profiles.utm_medium IS NULL
      THEN COALESCE(NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''), public.profiles.utm_medium, 'Direct')
      ELSE public.profiles.utm_medium
    END,
    utm_campaign = COALESCE(public.profiles.utm_campaign, NULLIF(NEW.raw_user_meta_data->>'utm_campaign', '')),
    utm_content = COALESCE(public.profiles.utm_content, NULLIF(NEW.raw_user_meta_data->>'utm_content', '')),
    utm_term = COALESCE(public.profiles.utm_term, NULLIF(NEW.raw_user_meta_data->>'utm_term', '')),
    updated_at = NOW();

  RETURN NEW;
END;
$function$
;
