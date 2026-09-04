-- Referral routing engine — Phase 1: schema + routing logic.
--
-- This is pure infrastructure. Nothing currently live calls any of this yet
-- (job_referrers starts empty, nothing writes to applications.assigned_referrer_id
-- until the frontend flow changes in a later phase), so this is safe to run
-- without affecting anything in production today.
--
-- Model: a company's own job posting (or, if none exists yet, the first
-- employee's referral) is the one canonical requisition. Employees join its
-- referrer pool instead of each creating a competing duplicate posting.
-- When a candidate applies, they're routed to one referrer at a time
-- (waterfall), ranked by capacity + historical reliability, with a 48-hour
-- SLA before auto-advancing to the next referrer in the pool.

-- ============================================================================
-- 1. SHARED HELPER: normalize a company name for matching/grouping.
--    Same normalization already used in generate_verification_code's
--    domain-match check (20260902130000) — reused here, not reimplemented,
--    so "Thessis Inc" / "Thessis, Inc." / "thessis" all normalize the same.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_company_name(p_company text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    regexp_replace(
      lower(coalesce(p_company, '')),
      '\y(inc|llc|ltd|corp|corporation|co|gmbh|plc|sa|srl|pvt|pty|limited|company)\y\.?', '', 'gi'
    ),
    '[^a-z0-9]', '', 'g'
  );
$$;

-- ============================================================================
-- 2. jobs.is_claimed_by_company — distinguishes an official company posting
--    from a "community canonical" one an employee created because no company
--    account had posted the role yet.
-- ============================================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_claimed_by_company boolean NOT NULL DEFAULT false;

-- Backfill: anything already created by a company-type account is inherently claimed.
UPDATE public.jobs j
SET is_claimed_by_company = true
FROM public.profiles p
WHERE j.created_by = p.id
  AND p.account_type = 'company'
  AND NOT j.is_claimed_by_company;

-- ============================================================================
-- 3. job_referrers — the pool of employees who've opted in to refer
--    candidates for a given (canonical) job.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_referrers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'opted_out')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_job_referrers_job_active
  ON public.job_referrers(job_id) WHERE status = 'active';

ALTER TABLE public.job_referrers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view a job's referrer pool" ON public.job_referrers;
CREATE POLICY "Anyone can view a job's referrer pool"
  ON public.job_referrers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Employees can join a job's referrer pool" ON public.job_referrers;
CREATE POLICY "Employees can join a job's referrer pool"
  ON public.job_referrers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Employees can update their own referrer status" ON public.job_referrers;
CREATE POLICY "Employees can update their own referrer status"
  ON public.job_referrers FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id);

-- ============================================================================
-- 4. applications: assignment tracking. Deliberately separate from the
--    existing `status` column — status reflects the referrer's read on the
--    candidate (pending/shortlisted/referred/rejected); assignment tracks
--    who's currently responsible for responding, and until when.
-- ============================================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS assigned_referrer_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assignment_expires_at timestamptz;

-- ============================================================================
-- 5. referral_assignments — history of every routing attempt for an
--    application. This is what makes the waterfall actually work: it's both
--    the "who's already been tried for this candidate" exclusion list AND
--    the source of truth for each referrer's reliability (response rate).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.referral_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'accepted', 'rejected', 'expired')),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_assignments_pending_expiry
  ON public.referral_assignments(expires_at) WHERE outcome = 'pending';
CREATE INDEX IF NOT EXISTS idx_referral_assignments_application
  ON public.referral_assignments(application_id);
CREATE INDEX IF NOT EXISTS idx_referral_assignments_employee
  ON public.referral_assignments(employee_id);

ALTER TABLE public.referral_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their own assignment history" ON public.referral_assignments;
CREATE POLICY "Participants can view their own assignment history"
  ON public.referral_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = employee_id
    OR auth.uid() = (SELECT applicant_id FROM public.applications WHERE id = application_id)
  );
-- No INSERT/UPDATE policy: only the SECURITY DEFINER functions below write
-- to this table, never the client directly.

-- ============================================================================
-- 6. assign_next_referrer — the ranking + assignment logic. Given an
--    application, finds the best eligible referrer who hasn't already been
--    tried, assigns them a 48-hour window, and notifies them. Returns the
--    assigned employee_id, or NULL if the pool is exhausted.
--
--    Ranking: capacity (exclude anyone with 5+ currently pending
--    assignments across all their referrals) → reliability (historical
--    accepted / (accepted+rejected+expired), untested referrers treated as
--    neutral) → longest-idle first as the tiebreak.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_next_referrer(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id uuid;
  v_next_employee_id uuid;
BEGIN
  SELECT job_id INTO v_job_id FROM public.applications WHERE id = p_application_id;
  IF v_job_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jr.employee_id INTO v_next_employee_id
  FROM public.job_referrers jr
  WHERE jr.job_id = v_job_id
    AND jr.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.referral_assignments ra
      WHERE ra.application_id = p_application_id AND ra.employee_id = jr.employee_id
    )
    AND (
      SELECT count(*) FROM public.referral_assignments ra2
      WHERE ra2.employee_id = jr.employee_id AND ra2.outcome = 'pending'
    ) < 5
  ORDER BY
    COALESCE(
      (SELECT count(*) FILTER (WHERE outcome = 'accepted')::float
         / NULLIF(count(*) FILTER (WHERE outcome IN ('accepted', 'rejected', 'expired')), 0)
       FROM public.referral_assignments ra3
       WHERE ra3.employee_id = jr.employee_id),
      0.5
    ) DESC,
    (SELECT max(ra4.assigned_at) FROM public.referral_assignments ra4
     WHERE ra4.employee_id = jr.employee_id) ASC NULLS FIRST
  LIMIT 1;

  IF v_next_employee_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.applications
  SET assigned_referrer_id = v_next_employee_id,
      assignment_expires_at = now() + INTERVAL '48 hours'
  WHERE id = p_application_id;

  INSERT INTO public.referral_assignments (application_id, job_id, employee_id, expires_at)
  VALUES (p_application_id, v_job_id, v_next_employee_id, now() + INTERVAL '48 hours');

  PERFORM public.send_transactional_email(
    p.email,
    p.full_name,
    'New referral match — respond within 48 hours',
    public.render_email_shell(
      'A candidate has been matched with you',
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been matched with a candidate</h2>' ||
        '<p style="margin:0 0 20px;color:#4B5563;">Respond within 48 hours, or this candidate will automatically move to the next available referrer.</p>' ||
        '%s',
        public.render_email_button('https://thessis.com/applications/' || v_job_id, 'Review Candidate')
      )
    )
  )
  FROM public.profiles p WHERE p.id = v_next_employee_id;

  RETURN v_next_employee_id;
END;
$$;

-- ============================================================================
-- 7. sweep_expired_assignments — run on a schedule (see pg_cron registration
--    below). Finds every assignment whose 48-hour window has passed with no
--    action taken, marks it expired, and routes to the next referrer. If the
--    pool is exhausted, clears the assignment — the empty/exhausted-pool
--    fallback (direct-apply for claimed jobs vs. queued message for
--    community-canonical ones) is handled in the application layer in a
--    later phase, not here.
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
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 8. Schedule the sweep hourly via pg_cron. If this errors with "extension
--    pg_cron does not exist", enable it first in the Supabase Dashboard:
--    Database -> Extensions -> search "pg_cron" -> Enable, then re-run just
--    this last section.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-expired-referral-assignments') THEN
    PERFORM cron.unschedule('sweep-expired-referral-assignments');
  END IF;
END $$;

SELECT cron.schedule(
  'sweep-expired-referral-assignments',
  '0 * * * *',
  $$SELECT public.sweep_expired_assignments();$$
);
