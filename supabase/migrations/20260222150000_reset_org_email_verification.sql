-- Reset all secondary org email verifications
-- This forces all users to re-verify their organization email before creating a referral.
-- The work_email column is preserved so users can see what they had before.

UPDATE public.profiles
SET 
    work_email_verified = FALSE,
    secondary_email_verified = FALSE
WHERE 
    work_email_verified = TRUE 
    OR secondary_email_verified = TRUE;
