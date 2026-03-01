-- Ensure structured profile sections are present in all environments.
-- These fields are used by the web profile editor and public profile views.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experiences jsonb[],
  ADD COLUMN IF NOT EXISTS education jsonb[],
  ADD COLUMN IF NOT EXISTS skills jsonb[],
  ADD COLUMN IF NOT EXISTS achievements jsonb[];
