-- Per-user "first seen" tracking for the "New" job-card tag.
--
-- Previously the "New" badge had nothing to do with recency at all — it was
-- rendered on whichever job happened to be at index 0 of the currently
-- sorted/filtered list. This replaces that with real per-user tracking: a
-- job shows "New" for 24 hours starting from the moment THAT USER first saw
-- it, not from when the job was posted and not shared across users.

CREATE TABLE IF NOT EXISTS public.job_first_views (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_first_views_user ON public.job_first_views(user_id);

ALTER TABLE public.job_first_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own first-view records" ON public.job_first_views;
CREATE POLICY "Users can view their own first-view records"
  ON public.job_first_views FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can record their own first-view" ON public.job_first_views;
CREATE POLICY "Users can record their own first-view"
  ON public.job_first_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);
