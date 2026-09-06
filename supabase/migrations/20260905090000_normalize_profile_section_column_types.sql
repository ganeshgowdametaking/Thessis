-- profiles.experiences/education/skills/achievements were originally added
-- as `jsonb[]` (20260301113000_add_profile_sections_columns.sql), but the
-- live schema has since drifted per-column via untracked manual edits:
-- `experiences` was already confirmed plain `jsonb` earlier this session
-- (the unnest(jsonb) bug fix), and live testing today found `education`
-- round-tripping as a `text` column holding a JSON-encoded string instead
-- of real jsonb. The app already defensively parses either shape
-- (web/src/utils/profileSectionNormalization.ts), but any SQL reading these
-- columns directly — e.g. the completeness-scoring function planned next —
-- needs them to be genuine jsonb. This inspects all four columns and
-- converts whichever ones are still `text` or `jsonb[]` to `jsonb` in
-- place, safely preserving existing data; columns already `jsonb` are left
-- untouched. Safe to run more than once.

CREATE OR REPLACE FUNCTION public._tmp_safe_jsonb_cast(input text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN input::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN '[]'::jsonb;
END;
$fn$;

DO $$
DECLARE
  v_column text;
  v_data_type text;
  v_udt_name text;
BEGIN
  FOREACH v_column IN ARRAY ARRAY['experiences', 'education', 'skills', 'achievements']
  LOOP
    SELECT data_type, udt_name INTO v_data_type, v_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = v_column;

    IF v_data_type = 'jsonb' THEN
      RAISE NOTICE 'profiles.% is already jsonb — no change needed.', v_column;

    ELSIF v_data_type = 'text' THEN
      EXECUTE format(
        'ALTER TABLE public.profiles ALTER COLUMN %I TYPE jsonb USING public._tmp_safe_jsonb_cast(%I::text)',
        v_column, v_column
      );
      EXECUTE format('ALTER TABLE public.profiles ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', v_column);
      RAISE NOTICE 'Converted profiles.% from text to jsonb.', v_column;

    ELSIF v_data_type = 'ARRAY' THEN
      EXECUTE format(
        'ALTER TABLE public.profiles ALTER COLUMN %I TYPE jsonb USING to_jsonb(coalesce(%I, ARRAY[]::jsonb[]))',
        v_column, v_column
      );
      EXECUTE format('ALTER TABLE public.profiles ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', v_column);
      RAISE NOTICE 'Converted profiles.% from jsonb[] to jsonb.', v_column;

    ELSE
      RAISE NOTICE 'profiles.% has unexpected type % (udt %) — left unchanged, check manually.', v_column, v_data_type, v_udt_name;
    END IF;
  END LOOP;
END $$;

DROP FUNCTION public._tmp_safe_jsonb_cast(text);
