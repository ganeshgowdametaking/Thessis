-- Resumes were being base64-encoded and embedded directly in the
-- applications table instead of uploaded to storage (the code even had a
-- comment flagging this as a "for development" shortcut). For a multi-MB
-- PDF that meant a multi-MB text payload on every application submit,
-- which was the dominant remaining contributor to the ~10s submit delay
-- after the notification/milestone-email calls were made non-blocking.
--
-- Same bucket pattern as message-attachments (20260220231500): public
-- bucket, uploads scoped to the uploader's own folder, matching the fact
-- that resume_url was already directly embeddable/shareable before this
-- (as a data: URL) — this doesn't reduce privacy versus that, and
-- ApplicationsPage.tsx's resume viewer already handles a real URL
-- (its `else` branch does `window.open(resumeUrl, '_blank')`), so no
-- frontend changes are needed there.

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own resume" ON storage.objects;
CREATE POLICY "Users can upload their own resume"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;
CREATE POLICY "Anyone can view resumes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resumes');
