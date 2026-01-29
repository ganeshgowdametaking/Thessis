/*
  # Fix Authentication Context for Connection Functions

  1. Problem Analysis
    - `auth.uid()` returns null when testing functions directly in SQL editor
    - Functions need to be called from authenticated client context
    - RLS policies work correctly but functions need proper auth context

  2. Solutions
    - Update functions to handle null auth context gracefully
    - Add better error messages and debugging
    - Ensure functions work with proper client authentication

  3. Testing
    - Functions should be tested from the application, not SQL editor
    - SQL editor tests will show null user_id (this is expected)
    - Real authentication happens through Supabase client
*/

-- Drop and recreate the functions with better error handling
DROP FUNCTION IF EXISTS delete_connection_safely(uuid);
DROP FUNCTION IF EXISTS check_connection_permissions(uuid);

-- Enhanced safe delete function with better auth handling
CREATE OR REPLACE FUNCTION delete_connection_safely(connection_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  current_user_id uuid;
  connection_record connections%ROWTYPE;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- If testing in SQL editor, auth.uid() will be null
  -- This is expected behavior - the function should be called from authenticated client
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'No authenticated user found. This function must be called from an authenticated Supabase client, not directly in SQL editor.';
    RETURN false;
  END IF;
  
  -- First, check if the connection exists and user has permission
  SELECT * INTO connection_record 
  FROM connections 
  WHERE id = connection_id;
  
  IF connection_record.id IS NULL THEN
    RAISE NOTICE 'Connection % not found', connection_id;
    RETURN false;
  END IF;
  
  -- Check if user is involved in the connection
  IF connection_record.requester_id != current_user_id AND connection_record.addressee_id != current_user_id THEN
    RAISE NOTICE 'User % not authorized to delete connection %', current_user_id, connection_id;
    RETURN false;
  END IF;
  
  -- Log the attempt
  RAISE NOTICE 'User % attempting to delete connection % (requester: %, addressee: %)', 
    current_user_id, connection_id, connection_record.requester_id, connection_record.addressee_id;
  
  -- Delete the connection
  DELETE FROM connections 
  WHERE id = connection_id 
  AND (requester_id = current_user_id OR addressee_id = current_user_id);
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the result
  RAISE NOTICE 'Successfully deleted % rows for connection %', deleted_count, connection_id;
  
  -- Return true if a row was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

-- Enhanced permission check function with better debugging
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
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'user_id', current_user_id,
    'auth_context', CASE 
      WHEN current_user_id IS NULL THEN 'No authentication context (SQL editor test)'
      ELSE 'Authenticated user found'
    END,
    'connection_exists', connection_record.id IS NOT NULL,
    'connection_id', connection_id,
    'requester_id', connection_record.requester_id,
    'addressee_id', connection_record.addressee_id,
    'connection_status', connection_record.status,
    'is_requester', connection_record.requester_id = current_user_id,
    'is_addressee', connection_record.addressee_id = current_user_id,
    'can_modify', (connection_record.requester_id = current_user_id OR connection_record.addressee_id = current_user_id),
    'note', CASE 
      WHEN current_user_id IS NULL THEN 'This function should be called from authenticated Supabase client, not SQL editor'
      ELSE 'Function called with proper authentication'
    END
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_connection_safely(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_connection_permissions(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION delete_connection_safely(uuid) IS 'Safely deletes a connection if the current authenticated user is involved in it. Must be called from authenticated Supabase client.';
COMMENT ON FUNCTION check_connection_permissions(uuid) IS 'Checks connection permissions for the current authenticated user. Returns null user_id when tested in SQL editor (this is expected).';

-- Verify the DELETE policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'connections' 
    AND policyname = 'connections_delete_policy'
    AND cmd = 'DELETE'
  ) THEN
    -- Create the DELETE policy if it doesn't exist
    EXECUTE 'CREATE POLICY "connections_delete_policy" ON connections FOR DELETE TO authenticated USING (requester_id = auth.uid() OR addressee_id = auth.uid())';
    RAISE NOTICE 'Created missing DELETE policy for connections table';
  ELSE
    RAISE NOTICE 'DELETE policy already exists for connections table';
  END IF;
END $$;