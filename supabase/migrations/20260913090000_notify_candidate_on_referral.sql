-- When a referrer marks a candidate as "Referred" — either via the plain
-- status button or by accepting a routed assignment — the candidate
-- currently has no way to know it happened at all. This closes that gap:
-- notify + email the candidate immediately, with a way to message the
-- referrer directly for updates (per user's own decision — this doesn't try
-- to verify the referral actually happened on the company's side, it just
-- gives the candidate a channel to follow up themselves).
--
-- Implemented as a trigger (not duplicated in both frontend call sites) so
-- it fires no matter which path set the status, same reasoning as the
-- existing set_job_claimed_status / handle_referrer_opt_out triggers.
--
-- "Who is the referrer" is simply whoever's session performed the update —
-- auth.uid() inside a trigger reflects the original caller's JWT regardless
-- of SECURITY DEFINER or call depth (same fact already documented on
-- handle_referrer_opt_out), so no need to branch on assigned_referrer_id
-- vs. jobs.created_by.

CREATE OR REPLACE FUNCTION public.notify_candidate_of_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid := auth.uid();
  v_referrer_name text;
  v_candidate_email text;
  v_candidate_name text;
  v_job_title text;
  v_message text;
  v_messages_url text;
BEGIN
  -- Both real call sites (status-button update, accept_referral_assignment)
  -- always run in an authenticated session. If this somehow fires without
  -- one, skip quietly rather than failing the status update itself.
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_referrer_name FROM public.profiles WHERE id = v_referrer_id;
  SELECT full_name, email INTO v_candidate_name, v_candidate_email
    FROM public.profiles WHERE id = NEW.applicant_id;
  SELECT title INTO v_job_title FROM public.jobs WHERE id = NEW.job_id;

  v_messages_url := 'https://www.thessis.com/messages?userId=' || v_referrer_id;

  v_message := format(
    'You got referred by %s for %s that you applied to. You can now reach out to %s for updates.',
    coalesce(v_referrer_name, 'a referrer'),
    coalesce(v_job_title, 'the role'),
    coalesce(v_referrer_name, 'them')
  );

  PERFORM public.create_notification_safely(
    'referral',
    'You got referred!',
    v_message,
    NEW.applicant_id,
    true,
    'high',
    jsonb_build_object('referrerId', v_referrer_id, 'applicationId', NEW.id, 'jobTitle', v_job_title)
  );

  IF v_candidate_email IS NOT NULL THEN
    PERFORM public.send_transactional_email(
      v_candidate_email,
      v_candidate_name,
      'You got referred for ' || coalesce(v_job_title, 'a role') || '!',
      public.render_email_shell(
        v_message,
        format(
          '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Great news!</h2>' ||
          '<p style="margin:0 0 20px;color:#4B5563;">%s</p>' ||
          '%s',
          public.escape_html(v_message),
          public.render_email_button(v_messages_url, 'Message ' || coalesce(v_referrer_name, 'your referrer'))
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_referred_notify_candidate ON public.applications;
CREATE TRIGGER on_application_referred_notify_candidate
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  WHEN (NEW.status = 'referred' AND OLD.status IS DISTINCT FROM 'referred')
  EXECUTE FUNCTION public.notify_candidate_of_referral();
