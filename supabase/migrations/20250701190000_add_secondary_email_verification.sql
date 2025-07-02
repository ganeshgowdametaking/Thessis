-- Add secondary email verification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN secondary_email TEXT,
ADD COLUMN secondary_email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN secondary_email_verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX idx_profiles_secondary_email_verified ON profiles(secondary_email_verified);

-- Add comment for documentation
COMMENT ON COLUMN profiles.secondary_email IS 'Organization email address for verification';
COMMENT ON COLUMN profiles.secondary_email_verified IS 'Whether the secondary email has been verified';
COMMENT ON COLUMN profiles.secondary_email_verified_at IS 'Timestamp when secondary email was verified'; 