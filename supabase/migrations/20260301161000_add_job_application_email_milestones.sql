-- Tracks referral application email milestones to prevent duplicate sends.
-- We send milestone emails when a job reaches exactly 1 or 5 applications.

CREATE TABLE IF NOT EXISTS public.job_application_email_milestones (
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  milestone integer NOT NULL CHECK (milestone IN (1, 5)),
  application_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_application_email_milestones_job_milestone
  ON public.job_application_email_milestones(job_id, milestone);

CREATE INDEX IF NOT EXISTS idx_job_application_email_milestones_created_at
  ON public.job_application_email_milestones(created_at DESC);

ALTER TABLE public.job_application_email_milestones ENABLE ROW LEVEL SECURITY;
