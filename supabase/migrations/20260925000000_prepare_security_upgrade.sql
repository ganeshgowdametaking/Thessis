-- Reconcile prerequisites missing from older, manually provisioned projects.
-- These columns already exist when the complete migration history was applied.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS work_email_verified_at timestamptz;

ALTER TABLE public.admin_invites
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
