-- The company name on a job and the employer named in a profile are free
-- text. Until an approval or authoritative company-domain mapping exists,
-- only the job creator may volunteer to handle its applicants. In particular,
-- a caller must not join another job's pool and wait for a private resume.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.job_referrers
  FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Employees can join a job's referrer pool"
  ON public.job_referrers;
DROP POLICY IF EXISTS "Employees can update their own referrer status"
  ON public.job_referrers;

-- Some deployments may already have applied the earlier assigned-referrer
-- SELECT policy. Remove it even when that earlier migration has been edited.
DROP POLICY IF EXISTS "Assigned referrers can view current applications"
  ON public.applications;

-- CreateReferralPage treats any returned job as one the caller can join.
-- Limit that lookup to their own postings; another person's posting should
-- lead to a new individual referral rather than an unauthorized join attempt.
CREATE OR REPLACE FUNCTION public.find_canonical_job(
  p_company text,
  p_title text
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT j.id
  FROM public.jobs AS j
  WHERE j.created_by = auth.uid()
    AND public.normalize_company_name(j.company) =
        public.normalize_company_name(p_company)
    AND lower(btrim(j.title)) = lower(btrim(p_title))
    AND j.status = 'active'
  ORDER BY j.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_canonical_job(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_canonical_job(text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.join_job_as_referrer(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs AS j
    JOIN auth.users AS u ON u.id = j.created_by
    WHERE j.id = p_job_id
      AND j.created_by = auth.uid()
      AND j.status = 'active'
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Only the confirmed job creator can join this referrer pool'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.job_referrers (job_id, employee_id, status)
  VALUES (p_job_id, auth.uid(), 'active')
  ON CONFLICT (job_id, employee_id)
  DO UPDATE SET status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.join_job_as_referrer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_job_as_referrer(uuid)
  TO authenticated;

-- Recheck eligibility at assignment time. This also prevents old pool rows
-- for noncreators from receiving new applicants after this migration.
CREATE OR REPLACE FUNCTION public.assign_next_referrer(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job_id uuid;
  v_next_employee_id uuid;
BEGIN
  SELECT job_id INTO v_job_id
  FROM public.applications WHERE id = p_application_id;
  IF v_job_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jr.employee_id INTO v_next_employee_id
  FROM public.job_referrers AS jr
  JOIN public.jobs AS j ON j.id = jr.job_id
  JOIN auth.users AS u ON u.id = jr.employee_id
  WHERE jr.job_id = v_job_id
    AND jr.status = 'active'
    AND j.created_by = jr.employee_id
    AND u.email_confirmed_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.referral_assignments AS ra
      WHERE ra.application_id = p_application_id
        AND ra.employee_id = jr.employee_id
    )
    AND (
      SELECT count(*) FROM public.referral_assignments AS ra2
      WHERE ra2.employee_id = jr.employee_id AND ra2.outcome = 'pending'
    ) < 5
  ORDER BY
    COALESCE(
      (SELECT count(*) FILTER (WHERE outcome = 'accepted')::float
         / NULLIF(count(*) FILTER (WHERE outcome IN ('accepted', 'rejected', 'expired')), 0)
       FROM public.referral_assignments AS ra3
       WHERE ra3.employee_id = jr.employee_id),
      0.5
    ) DESC,
    (SELECT max(ra4.assigned_at) FROM public.referral_assignments AS ra4
     WHERE ra4.employee_id = jr.employee_id) ASC NULLS FIRST
  LIMIT 1;

  IF v_next_employee_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.applications
  SET assigned_referrer_id = v_next_employee_id,
      assignment_expires_at = now() + INTERVAL '48 hours'
  WHERE id = p_application_id;

  INSERT INTO public.referral_assignments
    (application_id, job_id, employee_id, expires_at)
  VALUES
    (p_application_id, v_job_id, v_next_employee_id, now() + INTERVAL '48 hours');

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
  FROM public.profiles AS p WHERE p.id = v_next_employee_id;

  RETURN v_next_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_next_referrer(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_next_referrer(uuid)
  TO service_role;

-- Old noncreator assignments may still have a live deadline. They must not
-- be able to accept a candidate or force a reroute while waiting to expire.
CREATE OR REPLACE FUNCTION public.accept_referral_assignment(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT a.assigned_referrer_id INTO v_employee_id
  FROM public.applications AS a
  JOIN public.jobs AS j ON j.id = a.job_id
  WHERE a.id = p_application_id
    AND j.created_by = auth.uid()
    AND a.status IS DISTINCT FROM 'referred'
    AND a.assignment_expires_at > now()
  FOR UPDATE OF a;

  IF v_employee_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This candidate is not currently assigned to you'
      USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.accept_referral_assignment(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_referral_assignment(uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_referral_assignment(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT a.assigned_referrer_id INTO v_employee_id
  FROM public.applications AS a
  JOIN public.jobs AS j ON j.id = a.job_id
  WHERE a.id = p_application_id
    AND j.created_by = auth.uid()
    AND a.status IS DISTINCT FROM 'referred'
    AND a.assignment_expires_at > now()
  FOR UPDATE OF a;

  IF v_employee_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'This candidate is not currently assigned to you'
      USING ERRCODE = '42501';
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

REVOKE ALL ON FUNCTION public.reject_referral_assignment(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_referral_assignment(uuid)
  TO authenticated;

-- Work-email verification codes were returned by a client-callable RPC, and
-- users could read or insert their own code rows. Preserve the client-facing
-- RPC signature while making the code and its table server-only.
UPDATE public.verification_codes
SET expires_at = now()
WHERE verified_at IS NULL AND expires_at > now();

DROP POLICY IF EXISTS "Users can insert their own verification codes"
  ON public.verification_codes;
DROP POLICY IF EXISTS "Users can read their own verification codes"
  ON public.verification_codes;
REVOKE ALL ON TABLE public.verification_codes
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.generate_verification_code_internal(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.generate_verification_code(uuid, text)
      RENAME TO generate_verification_code_internal;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_verification_code_internal(uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_verification_code(
  p_user_id uuid,
  p_email text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.generate_verification_code_internal(p_user_id, p_email);
  RETURN 'sent';
END;
$$;

REVOKE ALL ON FUNCTION public.generate_verification_code(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_verification_code(uuid, text)
  TO authenticated;
