-- Add display_title column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_title TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.display_title IS 'The user-facing professional title captured during onboarding (e.g., Senior Systems Architect)';
