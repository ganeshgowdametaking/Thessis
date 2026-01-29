-- ========================================
-- MANUAL FIX FOR MISSING DELETE POLICY AND FUNCTIONS
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ========================================

-- Step 1: Check current policies (for debugging)
-- You can run this first to see what policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'connections';

-- Step 2: Drop any conflicting policies to start fresh
DROP POLICY IF EXISTS "Users can delete their own connection requests" ON connections;
DROP POLICY IF EXISTS "Users can delete connections they are involved in" ON connections;
DROP POLICY IF EXISTS "connections_delete_policy" ON connections;

-- Step 3: Create the missing DELETE policy
CREATE POLICY "connections_delete_policy"
  ON connections FOR DELETE
  TO authenticated
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- Step 4: Drop existing functions if they exist
DROP FUNCTION IF EXISTS delete_connection_safely(uuid);
DROP FUNCTION IF EXISTS check_connection_permissions(uuid);

-- Step 5: Create the safe delete function
CREATE OR REPLACE FUNCTION delete_connection_safely(connection_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  current_user_id uuid;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'User not authenticated';
    RETURN false;
  END IF;
  
  -- Log the attempt
  RAISE NOTICE 'Attempting to delete connection % for user %', connection_id, current_user_id;
  
  -- Delete the connection if the user is involved in it
  DELETE FROM connections 
  WHERE id = connection_id 
  AND (requester_id = current_user_id OR addressee_id = current_user_id);
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the result
  RAISE NOTICE 'Deleted % rows', deleted_count;
  
  -- Return true if a row was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

-- Step 6: Create the permission check function for debugging
CREATE OR REPLACE FUNCTION check_connection_permissions(connection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  connection_record connections%ROWTYPE;
  result jsonb;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Get the connection record
  SELECT * INTO connection_record FROM connections WHERE id = connection_id;
  
  -- Build result
  result := jsonb_build_object(
    'user_id', current_user_id,
    'connection_exists', connection_record.id IS NOT NULL,
    'is_requester', connection_record.requester_id = current_user_id,
    'is_addressee', connection_record.addressee_id = current_user_id,
    'can_modify', (connection_record.requester_id = current_user_id OR connection_record.addressee_id = current_user_id),
    'connection_status', connection_record.status,
    'requester_id', connection_record.requester_id,
    'addressee_id', connection_record.addressee_id
  );
  
  RETURN result;
END;
$$;

-- Step 7: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_connection_safely(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_connection_permissions(uuid) TO authenticated;

-- Step 8: Verify the setup (you can uncomment these to test)
-- SELECT 'Policies created successfully' as status;
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'connections' AND cmd = 'DELETE';

-- Step 9: Test the function exists
-- SELECT 'Function exists: ' || (SELECT COUNT(*) FROM pg_proc WHERE proname = 'delete_connection_safely') as function_check;