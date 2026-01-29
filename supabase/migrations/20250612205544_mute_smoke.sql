/*
  # Fix Notifications RLS Policy

  1. Problem
    - Current RLS policy prevents creating notifications for other users
    - Notifications need to be created by the system for other users (likes, comments, connections)
    - Current policy only allows users to insert notifications for themselves

  2. Solution
    - Update INSERT policy to allow authenticated users to create notifications for any user
    - This is safe because notifications are created by the application logic, not directly by users
    - Keep SELECT and UPDATE policies restricted to own notifications

  3. Security
    - Users can only view and update their own notifications
    - Any authenticated user can create notifications (needed for system notifications)
    - This follows the pattern of other social platforms
*/

-- Drop the existing INSERT policy for notifications
DROP POLICY IF EXISTS "Users can create notifications" ON notifications;

-- Create a new INSERT policy that allows authenticated users to create notifications for any user
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure the SELECT policy exists and is correct (users can only see their own notifications)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure the UPDATE policy exists and is correct (users can only update their own notifications)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add a helpful comment
COMMENT ON POLICY "Authenticated users can create notifications" ON notifications IS 
'Allows authenticated users to create notifications for any user. This is necessary for system-generated notifications like likes, comments, and connection requests.';