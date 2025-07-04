-- Add a country_code column to profiles for ISO 3 country codes
ALTER TABLE profiles ADD COLUMN country_code VARCHAR(3);

-- (Optional) Add an index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON profiles(country_code); 