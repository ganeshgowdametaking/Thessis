-- Add seniority column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seniority TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.seniority IS 'Universal seniority bucket for professional categorization (e.g., Entry, Mid-Level, Senior, etc.)';
