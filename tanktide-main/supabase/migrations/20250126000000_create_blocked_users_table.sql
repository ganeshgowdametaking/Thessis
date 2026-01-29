-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can't block the same person twice
  UNIQUE(blocker_id, blocked_id),
  
  -- Ensure a user can't block themselves
  CHECK (blocker_id != blocked_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_created_at ON blocked_users(created_at);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own blocking records (as blocker)
CREATE POLICY "Users can view their own blocking records" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

-- Users can only insert their own blocking records
CREATE POLICY "Users can create their own blocking records" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can only delete their own blocking records
CREATE POLICY "Users can delete their own blocking records" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Grant permissions
GRANT ALL ON blocked_users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;