-- Profile completeness — Phases 3-5 of the profile-completeness plan:
--   1. calculate_profile_completeness(profile_id) — a single, live-computed
--      0-100 score, weighted toward what referrers actually care about:
--        35  has at least one experience entry with a title + company
--        20  has at least one education entry with a degree + school
--        20  has 3+ named skills (partial credit below 3)
--        15  has a non-empty bio
--        10  has an avatar
--      Computed on the fly from the profiles row every call — never a
--      stored/cached flag — so it's automatically correct for both new
--      onboarding-wizard users and every pre-existing profile, with no
--      backfill needed.
--   2. Soft nudge: the frontend calls this RPC directly (JobsPage.tsx) to
--      show a non-blocking "complete your profile" banner below 70.
--   3. Hard floor: a BEFORE INSERT trigger on applications blocks any
--      application from a profile scoring below 35 (experience alone is
--      enough to clear it) — enforced at the database level so it can't be
--      bypassed by calling the applications insert directly, matching the
--      SECURITY DEFINER / explicit-grant pattern used elsewhere in this
--      project rather than relying on client-side gating alone.

CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(p_profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT (
    (CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(p.experiences, '[]'::jsonb)) AS e
      WHERE btrim(coalesce(e->>'title', '')) <> '' AND btrim(coalesce(e->>'company', '')) <> ''
    ) THEN 35 ELSE 0 END)
    +
    (CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(p.education, '[]'::jsonb)) AS e
      WHERE btrim(coalesce(e->>'degree', '')) <> '' AND btrim(coalesce(e->>'school', '')) <> ''
    ) THEN 20 ELSE 0 END)
    +
    LEAST(20, (
      SELECT count(*)::int FROM jsonb_array_elements(COALESCE(p.skills, '[]'::jsonb)) AS s
      WHERE btrim(coalesce(s->>'name', '')) <> ''
    ) * 7)
    +
    (CASE WHEN btrim(coalesce(p.bio, '')) <> '' THEN 15 ELSE 0 END)
    +
    (CASE WHEN p.avatar_url IS NOT NULL AND btrim(p.avatar_url) <> '' THEN 10 ELSE 0 END)
  )::integer
  FROM public.profiles p
  WHERE p.id = p_profile_id;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_profile_completeness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completeness(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completeness(uuid) TO service_role;

-- Hard floor: block application creation outright below a minimum score,
-- with a clear, actionable message (surfaced as-is by JobsPage.tsx's
-- existing applicationError handling — no client changes needed there).
CREATE OR REPLACE FUNCTION public.enforce_profile_completeness_for_application()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_score integer;
  v_floor CONSTANT integer := 35;
BEGIN
  v_score := public.calculate_profile_completeness(NEW.applicant_id);

  IF v_score < v_floor THEN
    RAISE EXCEPTION 'Add your work experience to your profile before applying (currently % / 100 complete — % needed).', v_score, v_floor;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_completeness ON public.applications;
CREATE TRIGGER trg_enforce_profile_completeness
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_completeness_for_application();
