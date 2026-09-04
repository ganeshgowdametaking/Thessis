-- Referral routing engine — Phase 3a: supporting functions for the frontend
-- flow (finding/joining a canonical job, and the referrer's Accept/Reject
-- actions).

-- ============================================================================
-- 1. Auto-set jobs.is_claimed_by_company on insert, based on the creator's
--    account type. Keeps this correct regardless of which page creates the
--    row (CompanyNewJobPage vs CreateReferralPage), instead of duplicating
--    this logic in both places client-side.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_job_claimed_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.is_claimed_by_company := EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.created_by AND account_type = 'company'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_created_set_claimed_status ON public.jobs;
CREATE TRIGGER on_job_created_set_claimed_status
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_job_claimed_status();

-- ============================================================================
-- 2. find_canonical_job — used by CreateReferralPage before creating a new
--    posting: is there already a job for this company + title? Matches on
--    normalized company name (so "Thessis Inc" / "thessis" collide) and
--    case-insensitive trimmed title.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_canonical_job(p_company text, p_title text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.jobs
  WHERE public.normalize_company_name(company) = public.normalize_company_name(p_company)
    AND lower(btrim(title)) = lower(btrim(p_title))
    AND status = 'active'
  ORDER BY is_claimed_by_company DESC, created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_canonical_job(text, text) TO authenticated;

-- ============================================================================
-- 3. join_job_as_referrer — an employee attaching themselves to an existing
--    canonical job's referrer pool instead of creating a duplicate posting.
--    Idempotent: joining twice, or rejoining after opting out, just
--    reactivates the existing row.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_job_as_referrer(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.job_referrers (job_id, employee_id, status)
  VALUES (p_job_id, auth.uid(), 'active')
  ON CONFLICT (job_id, employee_id)
  DO UPDATE SET status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_job_as_referrer(uuid) TO authenticated;

-- ============================================================================
-- 4. Referrer Accept/Reject actions on an assigned application.
--    Accept maps straight to status = 'referred' (matches the original
--    "Accept = submit to HR" framing — no intermediate shortlist step).
--    Reject does NOT wait for the 48h SLA — it immediately routes to the
--    next referrer, same as an SLA timeout does.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_referral_assignment(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT assigned_referrer_id INTO v_employee_id
  FROM public.applications WHERE id = p_application_id;

  IF v_employee_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This candidate is not currently assigned to you';
  END IF;

  UPDATE public.applications
  SET status = 'referred', assignment_expires_at = NULL
  WHERE id = p_application_id;

  UPDATE public.referral_assignments
  SET outcome = 'accepted', resolved_at = now()
  WHERE application_id = p_application_id
    AND employee_id = auth.uid()
    AND outcome = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_referral_assignment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_referral_assignment(p_application_id uuid)
RETURNS uuid  -- returns the newly assigned employee_id, or NULL if pool exhausted
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT assigned_referrer_id INTO v_employee_id
  FROM public.applications WHERE id = p_application_id;

  IF v_employee_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This candidate is not currently assigned to you';
  END IF;

  UPDATE public.referral_assignments
  SET outcome = 'rejected', resolved_at = now()
  WHERE application_id = p_application_id
    AND employee_id = auth.uid()
    AND outcome = 'pending';

  UPDATE public.applications
  SET assigned_referrer_id = NULL, assignment_expires_at = NULL
  WHERE id = p_application_id;

  RETURN public.assign_next_referrer(p_application_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_referral_assignment(uuid) TO authenticated;

-- ============================================================================
-- 5. Immediate failover when a referrer opts out mid-assignment — don't make
--    their currently-assigned candidates wait out the 48h SLA.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_referrer_opt_out()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app RECORD;
BEGIN
  IF NEW.status = 'opted_out' AND OLD.status = 'active' THEN
    FOR v_app IN
      SELECT id FROM public.applications
      WHERE assigned_referrer_id = NEW.employee_id
        AND job_id = NEW.job_id
        AND status = 'pending'
    LOOP
      -- auth.uid() stays the opting-out employee throughout this nested call
      -- (it reflects the session's JWT, not affected by SECURITY DEFINER or
      -- call depth), so reject_referral_assignment's own auth check passes.
      PERFORM public.reject_referral_assignment(v_app.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_referrer_opt_out_failover ON public.job_referrers;
CREATE TRIGGER on_referrer_opt_out_failover
  AFTER UPDATE ON public.job_referrers
  FOR EACH ROW EXECUTE FUNCTION public.handle_referrer_opt_out();
