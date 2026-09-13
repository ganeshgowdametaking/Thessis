-- Applicant ranking engine integration.
--
-- The existing resume-ranking service (web/resume-ranking/) kept its own
-- disconnected SQLAlchemy schema instead of writing into the real
-- applications table, which is a big part of why the feature never actually
-- worked end to end. This migration adds dedicated columns for its output
-- (deliberately NOT reusing the existing `rating` column — that's a
-- decimal(2,1), a 0-9.9 scale, unrelated to this engine's 0-100 score) and
-- two service-role-only RPCs so the ranking service can read what it needs
-- to score an application and write its result back, without needing a
-- direct Postgres connection or broader table access than it actually needs.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS ai_score numeric,
  ADD COLUMN IF NOT EXISTS ai_semantic_score numeric,
  ADD COLUMN IF NOT EXISTS ai_skill_score numeric,
  ADD COLUMN IF NOT EXISTS ai_rationale text,
  ADD COLUMN IF NOT EXISTS ai_ranked_at timestamptz;

-- ============================================================================
-- get_application_for_ranking — everything the ranking service needs for one
-- application: the job description to score against, the resume to
-- download, and the applicant's profile text as a light secondary signal.
-- Bypasses RLS by design (SECURITY DEFINER + service_role-only grant below)
-- since the caller here is the backend service, not a browser session with
-- an auth.uid() — there is no user context to scope this by.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_application_for_ranking(p_application_id uuid)
RETURNS TABLE (
  application_id uuid,
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
      -- profiles.skills was normalized to plain jsonb (holding a JSON array)
      -- by 20260905090000_normalize_profile_section_column_types.sql —
      -- jsonb_array_elements_text, not unnest (that's for native Postgres
      -- arrays, which this column no longer is).
      (SELECT nullif(string_agg(elem, ', '), '')
       FROM jsonb_array_elements_text(COALESCE(p.skills, '[]'::jsonb)) AS elem)
    )
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  JOIN public.profiles p ON p.id = a.applicant_id
  WHERE a.id = p_application_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_application_for_ranking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_application_for_ranking(uuid) TO service_role;

-- ============================================================================
-- save_application_ranking — persists one application's score. Scores are
-- clamped to [0, 100] here as a defensive floor/ceiling regardless of what
-- the caller computed, so a scoring-side bug can't silently write an
-- out-of-range value a referrer would see and trust.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_application_ranking(
  p_application_id uuid,
  p_score numeric,
  p_semantic_score numeric,
  p_skill_score numeric,
  p_rationale text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.applications
  SET
    ai_score = greatest(0, least(100, p_score)),
    ai_semantic_score = greatest(0, least(100, p_semantic_score)),
    ai_skill_score = greatest(0, least(100, p_skill_score)),
    ai_rationale = p_rationale,
    ai_ranked_at = now()
  WHERE id = p_application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application % not found', p_application_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_application_ranking(uuid, numeric, numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_application_ranking(uuid, numeric, numeric, numeric, text) TO service_role;
