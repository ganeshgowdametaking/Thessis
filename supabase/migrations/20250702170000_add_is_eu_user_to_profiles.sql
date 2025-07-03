-- Add is_eu_user column to profiles table for regional GDPR compliance
ALTER TABLE profiles ADD COLUMN is_eu_user BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.is_eu_user IS 'True if the user is in the EU/EEA for GDPR compliance'; 