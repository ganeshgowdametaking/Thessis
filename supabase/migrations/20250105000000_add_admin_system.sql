/*
  # Add Admin System to TankTide Database

  1. New Tables
    - `admin_invites` - Store admin invitation tokens
  
  2. Schema Updates
    - Add `role` column to `profiles` table
    
  3. Security
    - Enable RLS on admin_invites table
    - Add policies for admin operations
    - Update profiles policies to allow role updates

  4. Performance
    - Add indexes for better query performance
*/

-- Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Add comment to explain role column
COMMENT ON COLUMN profiles.role IS 'User role: user, admin';

-- Create admin_invites table
CREATE TABLE IF NOT EXISTS admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted boolean DEFAULT false,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_invites (only service role can access)
CREATE POLICY "Service role can manage admin invites"
  ON admin_invites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update profiles policies to allow basic access
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy for service role to update user roles (for admin promotion)
CREATE POLICY "Service role can update any profile"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_token ON admin_invites(token);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites(email);
CREATE INDEX IF NOT EXISTS idx_admin_invites_expires_at ON admin_invites(expires_at);

-- Create trigger for updating admin_invites timestamps
CREATE TRIGGER update_admin_invites_updated_at 
  BEFORE UPDATE ON admin_invites 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
