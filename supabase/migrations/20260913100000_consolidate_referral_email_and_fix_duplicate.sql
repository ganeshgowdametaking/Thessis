-- Fixes a duplicate-email bug from the previous migration
-- (20260913090000_notify_candidate_on_referral.sql): that migration added a
-- SEPARATE trigger on applications for status -> 'referred', without
-- realizing handle_application_status_email() (20260902120000) already has
-- its own 'referred' branch that emails the candidate. Result: every
-- referral fired two different "you got referred" emails back to back.
--
-- Fix: merge the referrer-name + "Message [referrer]" button content into
-- the EXISTING handle_application_status_email() function's 'referred'
-- branch (shortlisted/rejected branches are untouched), and drop the
-- separate trigger/function entirely so there's exactly one email per
-- status change again. The in-app notification (which the old function
-- never sent — it's email-only) is added here as the one genuinely new
-- piece of behavior.

DROP TRIGGER IF EXISTS on_application_referred_notify_candidate ON public.applications;
DROP FUNCTION IF EXISTS public.notify_candidate_of_referral();

CREATE OR REPLACE FUNCTION public.handle_application_status_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant_email text;
  v_applicant_name text;
  v_job_title text;
  v_job_company text;
  v_subject text;
  v_body text;
  v_referrer_id uuid;
  v_referrer_name text;
  v_messages_url text;
  v_notification_message text;
BEGIN
  IF new.status NOT IN ('shortlisted', 'referred', 'rejected') THEN
    RETURN new;
  END IF;

  SELECT email, full_name INTO v_applicant_email, v_applicant_name
  FROM public.profiles WHERE id = new.applicant_id;

  SELECT title, company INTO v_job_title, v_job_company
  FROM public.jobs WHERE id = new.job_id;

  IF new.status = 'shortlisted' THEN
    v_subject := 'You''ve been shortlisted for ' || coalesce(v_job_title, 'a role on Thessis');
    v_body := format(
      '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been shortlisted</h2>' ||
      '<p style="margin:0 0 12px;color:#4b5563;">Good news — you''ve been shortlisted for <strong>%s</strong> at <strong>%s</strong>.</p>' ||
      '<p style="margin:0;color:#4b5563;">The referrer is reviewing shortlisted candidates now.</p>',
      public.escape_html(coalesce(v_job_title, 'this role')),
      public.escape_html(coalesce(v_job_company, 'the company'))
    );

  ELSIF new.status = 'referred' THEN
    -- Who referred them: whoever's session performed this update. auth.uid()
    -- inside a trigger reflects the original caller's JWT regardless of
    -- SECURITY DEFINER or call depth (same fact already relied on by
    -- handle_referrer_opt_out), so this is correct for both the plain
    -- status-button path and accept_referral_assignment.
    v_referrer_id := auth.uid();
    IF v_referrer_id IS NOT NULL THEN
      SELECT full_name INTO v_referrer_name FROM public.profiles WHERE id = v_referrer_id;
    END IF;

    v_messages_url := 'https://www.thessis.com/messages'
      || CASE WHEN v_referrer_id IS NOT NULL THEN '?userId=' || v_referrer_id ELSE '' END;

    v_subject := 'You''ve been referred for ' || coalesce(v_job_title, 'a role on Thessis');
    v_body := format(
      '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been referred 🎉</h2>' ||
      '<p style="margin:0 0 12px;color:#4b5563;">%s just referred you for <strong>%s</strong> at <strong>%s</strong>.</p>' ||
      '<p style="margin:0 0 20px;color:#4b5563;">You can reach out to them directly for updates.</p>' ||
      '%s',
      public.escape_html(coalesce(v_referrer_name, 'Your referrer')),
      public.escape_html(coalesce(v_job_title, 'this role')),
      public.escape_html(coalesce(v_job_company, 'the company')),
      public.render_email_button(v_messages_url, 'Message ' || coalesce(v_referrer_name, 'your referrer'))
    );

    IF v_referrer_id IS NOT NULL THEN
      v_notification_message := format(
        'You got referred by %s for %s that you applied to. You can now reach out to %s for updates.',
        coalesce(v_referrer_name, 'a referrer'),
        coalesce(v_job_title, 'the role'),
        coalesce(v_referrer_name, 'them')
      );

      PERFORM public.create_notification_safely(
        'referral',
        'You got referred!',
        v_notification_message,
        new.applicant_id,
        true,
        'high',
        jsonb_build_object('referrerId', v_referrer_id, 'applicationId', new.id, 'jobTitle', v_job_title)
      );
    END IF;

  ELSE
    v_subject := 'Update on your application for ' || coalesce(v_job_title, 'a role on Thessis');
    v_body := format(
      '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Application update</h2>' ||
      '<p style="margin:0 0 12px;color:#4b5563;">You weren''t moved forward for <strong>%s</strong> at <strong>%s</strong> this time.</p>' ||
      '<p style="margin:0;color:#4b5563;">Keep browsing — new referrals are posted regularly.</p>',
      public.escape_html(coalesce(v_job_title, 'this role')),
      public.escape_html(coalesce(v_job_company, 'the company'))
    );
  END IF;

  PERFORM public.send_transactional_email(
    v_applicant_email,
    v_applicant_name,
    v_subject,
    public.render_email_shell(public.escape_html(v_subject), v_body)
  );
  RETURN new;
END;
$$;

-- Trigger itself is unchanged (same name, same WHEN clause) — CREATE OR
-- REPLACE FUNCTION above already updated its behavior, but re-declaring the
-- trigger is harmless and keeps this migration self-contained/re-runnable.
DROP TRIGGER IF EXISTS on_application_status_changed_send_email ON public.applications;
CREATE TRIGGER on_application_status_changed_send_email
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  WHEN (old.status IS DISTINCT FROM new.status)
  EXECUTE FUNCTION public.handle_application_status_email();
