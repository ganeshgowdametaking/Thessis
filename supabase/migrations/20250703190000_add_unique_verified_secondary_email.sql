-- Enforce uniqueness of verified secondary_email in profiles
CREATE UNIQUE INDEX unique_verified_secondary_email
ON profiles (secondary_email)
WHERE secondary_email IS NOT NULL AND secondary_email_verified = true; 