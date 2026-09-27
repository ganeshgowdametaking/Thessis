-- Referral acceptance runs with an empty search_path. Qualify its legacy points trigger.
CREATE OR REPLACE FUNCTION public.award_points_for_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  application_duration interval;
  referrer_id uuid;
BEGIN
  -- Only trigger on status change from 'pending'
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN

    -- Get referrer (job creator) ID
    SELECT created_by INTO referrer_id FROM public.jobs WHERE id = NEW.job_id;

    -- Calculate response time
    application_duration := now() - NEW.applied_at;

    -- Fast Response (< 48h)
    IF application_duration < interval '48 hours' THEN
      INSERT INTO public.tide_points_ledger (user_id, amount, action_type, entity_id)
      VALUES (referrer_id, 50, 'response_48h', NEW.id);

    -- Standard Response (< 5 days)
    ELSIF application_duration < interval '5 days' THEN
      INSERT INTO public.tide_points_ledger (user_id, amount, action_type, entity_id)
      VALUES (referrer_id, 10, 'response_5d', NEW.id);
    END IF;

  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_tide_points_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.profiles
  SET tide_points_balance = tide_points_balance + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$function$;
