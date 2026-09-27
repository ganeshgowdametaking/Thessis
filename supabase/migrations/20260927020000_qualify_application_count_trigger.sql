-- submit_application intentionally uses an empty search_path. Trigger helpers
-- invoked underneath it must resolve application tables explicitly.
CREATE OR REPLACE FUNCTION public.increment_applications_count()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  UPDATE public.jobs
  SET applications_count = coalesce(applications_count, 0) + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;
