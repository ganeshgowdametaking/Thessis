-- Fix Row Level Security Policies for Jobs Table
-- This script ensures users can see all active jobs regardless of who created them

-- First, let's check the current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'jobs';

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view all jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;

-- Recreate the policies with proper permissions

-- Policy 1: Allow all authenticated users to view ALL jobs (this is the key fix)
CREATE POLICY "Users can view all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);  -- This allows viewing ALL jobs, not just user's own jobs

-- Policy 2: Allow authenticated users to create jobs
CREATE POLICY "Users can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy 3: Allow users to update only their own jobs
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policy 4: Allow users to delete only their own jobs
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'jobs';

-- Test query to verify the fix works
-- This should return all active jobs for any authenticated user
SELECT id, title, status, created_by, created_at 
FROM jobs 
WHERE status = 'active' 
ORDER BY created_at DESC; 