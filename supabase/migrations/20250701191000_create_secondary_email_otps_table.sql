-- Create table for storing secondary email OTPs
CREATE TABLE IF NOT EXISTS secondary_email_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_secondary_email_otps_user_id ON secondary_email_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_secondary_email_otps_email ON secondary_email_otps(email);
CREATE INDEX IF NOT EXISTS idx_secondary_email_otps_expires_at ON secondary_email_otps(expires_at);

-- Add RLS policies
ALTER TABLE secondary_email_otps ENABLE ROW LEVEL SECURITY;

-- Users can only see their own OTPs
CREATE POLICY "Users can view own secondary email OTPs" ON secondary_email_otps
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own OTPs
CREATE POLICY "Users can insert own secondary email OTPs" ON secondary_email_otps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own OTPs (for marking as used)
CREATE POLICY "Users can update own secondary email OTPs" ON secondary_email_otps
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE secondary_email_otps IS 'Stores OTPs for secondary email verification';
COMMENT ON COLUMN secondary_email_otps.user_id IS 'User who requested the OTP';
COMMENT ON COLUMN secondary_email_otps.email IS 'Email address to verify';
COMMENT ON COLUMN secondary_email_otps.otp IS '6-digit verification code';
COMMENT ON COLUMN secondary_email_otps.expires_at IS 'When the OTP expires';
COMMENT ON COLUMN secondary_email_otps.used_at IS 'When the OTP was used (null if unused)'; 