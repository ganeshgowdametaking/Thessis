-- Resumes contain applicant personal data. Keep the bucket private and let
-- applicants read their own objects. Reviewers receive short-lived signed
-- URLs only after get-application-resume-url checks the application owner.
UPDATE storage.buckets
SET public = false
WHERE id = 'resumes';

DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;

CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
