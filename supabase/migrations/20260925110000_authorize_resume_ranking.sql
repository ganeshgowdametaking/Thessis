-- Ranking handles private applicant data. The backend verifies the session JWT
-- and passes its subject to these service-role-only RPCs. Authorization is
-- checked while reading and again while writing, in case ownership changes
-- during a ranking request.

-- A referrer assignment alone is not proof of authorization: older pool-join
-- rules allowed any signed-in user to enter a job's pool. Only the job
-- creator may read ranking inputs until a trusted approval flow exists.

-- An expired assignment must not be accepted just before the scheduled
-- reassignment sweep. Acceptance clears its deadline, so accepting it late
-- would otherwise restore reviewer access indefinitely.
CREATE OR REPLACE FUNCTION public.accept_referral_assignment(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT a.assigned_referrer_id INTO v_employee_id
  FROM public.applications AS a
  JOIN public.jobs AS j ON j.id = a.job_id
  WHERE a.id = p_application_id
    AND a.assigned_referrer_id = j.created_by
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

REVOKE ALL ON FUNCTION public.accept_referral_assignment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_referral_assignment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_application_for_ranking(
  p_application_id uuid,
  p_actor_id uuid
)
RETURNS TABLE (
  application_id uuid,
  applicant_id uuid,
  job_id uuid,
  job_title text,
  job_description text,
  resume_url text,
  applicant_full_name text,
  applicant_email text,
  profile_text text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    a.id,
    a.applicant_id,
    j.id,
    j.title,
    j.description,
    a.resume_url,
    p.full_name,
    p.email,
    concat_ws(
      E'\n',
      nullif(p.title, ''),
      nullif(p.company, ''),
      nullif(p.location, ''),
      (SELECT nullif(string_agg(elem, ', '), '')
       FROM jsonb_array_elements_text(COALESCE(p.skills, '[]'::jsonb)) AS elem)
    )
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  JOIN public.profiles p ON p.id = a.applicant_id
  WHERE a.id = p_application_id
    AND p_actor_id IS NOT NULL
    AND (
      j.created_by = p_actor_id
    );
$$;

REVOKE ALL ON FUNCTION public.get_application_for_ranking(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_application_for_ranking(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.save_application_ranking(
  p_application_id uuid,
  p_actor_id uuid,
  p_score numeric,
  p_semantic_score numeric,
  p_skill_score numeric,
  p_rationale text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.applications a
  SET
    ai_score = greatest(0, least(100, p_score)),
    ai_semantic_score = greatest(0, least(100, p_semantic_score)),
    ai_skill_score = greatest(0, least(100, p_skill_score)),
    ai_rationale = p_rationale,
    ai_ranked_at = now()
  WHERE a.id = p_application_id
    AND p_actor_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = a.job_id
        AND j.created_by = p_actor_id
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.save_application_ranking(uuid, uuid, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_application_ranking(uuid, uuid, numeric, numeric, numeric, text) TO service_role;

-- Retire the older overloads, which accepted an application ID without a
-- user identity. They must not remain available to privileged callers.
DROP FUNCTION IF EXISTS public.get_application_for_ranking(uuid);
DROP FUNCTION IF EXISTS public.save_application_ranking(uuid, numeric, numeric, numeric, text);
