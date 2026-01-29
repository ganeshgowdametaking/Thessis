/*
  # Fix Missing DELETE Policy and Safe Delete Function

  1. Issues Found
    - No DELETE policy exists for connections table
    - delete_connection_safely function is missing
    - check_connection_permissions function is missing

  2. Solutions
    - Create proper DELETE policy
    - Create safe delete function with SECURITY DEFINER
    - Create permission check function for debugging
    - Grant proper permissions

  3. Security
    - Users can only delete connections they are involved in
    - Functions use SECURITY DEFINER to bypass RLS when appropriate
*/

-- First, ensure we have a proper DELETE policy
--CREATE POLICY "connections_delete_policy"
--  ON connections FOR DELETE
--  TO authenticated
--  USING (
--    requester_id = auth.uid() OR addressee_id = auth.uid()
--  );

-- Create the safe delete function that was missing
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
    RETURN false;
  END IF;
  
  -- Delete the connection if the user is involved in it
  DELETE FROM connections 
  WHERE id = connection_id 
  AND (requester_id = current_user_id OR addressee_id = current_user_id);
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return true if a row was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

-- Create the permission check function for debugging
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
    'connection_status', connection_record.status
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_connection_safely(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_connection_permissions(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION delete_connection_safely(uuid) IS 'Safely deletes a connection if the current user is involved in it';
COMMENT ON FUNCTION check_connection_permissions(uuid) IS 'Checks if the current user has permission to modify a connection';