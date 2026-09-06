-- Referral routing engine — Phase 3b:
--   1. Security fix: assign_next_referrer and sweep_expired_assignments had
--      no explicit GRANT/REVOKE, so they were left with Postgres' default
--      PUBLIC EXECUTE grant — any authenticated user could call
--      assign_next_referrer on someone else's application directly. Same
--      class of gap as send_transactional_email earlier this session.
--   2. handle_unrouted_application — the empty/exhausted-pool fallback:
--      officially claimed jobs with a contact_email get notified directly;
--      community-canonical jobs with no referrer just stay unassigned (the
--      applicant already gets the standard "received" email regardless).
--   3. route_new_application — the actual entry point the frontend calls
--      after creating an application. Verifies the caller is the applicant
--      before routing, then falls back via (2) if the pool is empty.

-- ============================================================================
-- 1. Lock down the internal routing functions to server-side callers only.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.assign_next_referrer(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sweep_expired_assignments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_next_referrer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_expired_assignments() TO service_role;

-- accept/reject_referral_assignment and join_job_as_referrer already do
-- their own auth.uid() authorization checks internally, and were already
-- explicitly granted to `authenticated` in the prior migration — no change
-- needed there.

-- ============================================================================
-- 2. handle_unrouted_application
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_unrouted_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_title text;
  v_job_company text;
  v_contact_email text;
  v_is_claimed boolean;
BEGIN
  SELECT j.title, j.company, j.contact_email, j.is_claimed_by_company
  INTO v_job_title, v_job_company, v_contact_email, v_is_claimed
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  WHERE a.id = p_application_id;

  IF v_is_claimed AND v_contact_email IS NOT NULL THEN
    PERFORM public.send_transactional_email(
      v_contact_email,
      NULL,
      'New direct application — ' || coalesce(v_job_title, 'open role'),
      public.render_email_shell(
        'A candidate applied with no referrer currently available',
        format(
          '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">New application, no referrer available</h2>' ||
          '<p style="margin:0;color:#4B5563;">A candidate applied for <strong>%s</strong> at <strong>%s</strong>, but no referrer was available to review it. Please follow up directly.</p>',
          public.escape_html(coalesce(v_job_title, 'this role')),
          public.escape_html(coalesce(v_job_company, 'your company'))
        )
      )
    );
  END IF;
  -- Community-canonical jobs (not yet claimed by a company) with no
  -- available referrer: the application just stays unassigned. No extra
  -- email here — the applicant already gets the standard "received" email
  -- from the existing application-created trigger regardless of outcome.
END;
$$;

-- Internal only — called from route_new_application and
-- sweep_expired_assignments, never directly by a client.
REVOKE EXECUTE ON FUNCTION public.handle_unrouted_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_unrouted_application(uuid) TO service_role;

-- ============================================================================
-- 3. Wire the fallback into the sweep function's exhausted-pool branch too
--    (previously it just cleared the assignment with no notification at all).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sweep_expired_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired RECORD;
  v_next_employee_id uuid;
BEGIN
  FOR v_expired IN
    SELECT a.id AS application_id, a.job_id, a.assigned_referrer_id,
           ap.email AS candidate_email, ap.full_name AS candidate_name
    FROM public.applications a
    JOIN public.profiles ap ON ap.id = a.applicant_id
    WHERE a.assignment_expires_at IS NOT NULL
      AND a.assignment_expires_at < now()
      AND a.status = 'pending'
  LOOP
    UPDATE public.referral_assignments
    SET outcome = 'expired', resolved_at = now()
    WHERE application_id = v_expired.application_id
      AND employee_id = v_expired.assigned_referrer_id
      AND outcome = 'pending';

    v_next_employee_id := public.assign_next_referrer(v_expired.application_id);

    IF v_next_employee_id IS NOT NULL THEN
      PERFORM public.send_transactional_email(
        v_expired.candidate_email,
        v_expired.candidate_name,
        'Update on your referral request',
        public.render_email_shell(
          'We''ve escalated your profile to another referrer',
          '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Still finding you the right referrer</h2>' ||
          '<p style="margin:0;color:#4B5563;">We''ve escalated your profile to another referrer for a faster response.</p>'
        )
      );
    ELSE
      UPDATE public.applications
      SET assigned_referrer_id = NULL, assignment_expires_at = NULL
      WHERE id = v_expired.application_id;

      PERFORM public.handle_unrouted_application(v_expired.application_id);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 4. route_new_application — the frontend's entry point, called right after
--    an application is inserted. Verifies the caller is actually the
--    applicant before routing anything.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.route_new_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applicant_id uuid;
  v_assigned uuid;
BEGIN
  SELECT applicant_id INTO v_applicant_id
  FROM public.applications WHERE id = p_application_id;

  IF v_applicant_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to route this application';
  END IF;

  v_assigned := public.assign_next_referrer(p_application_id);

  IF v_assigned IS NULL THEN
    PERFORM public.handle_unrouted_application(p_application_id);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.route_new_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.route_new_application(uuid) TO authenticated;
