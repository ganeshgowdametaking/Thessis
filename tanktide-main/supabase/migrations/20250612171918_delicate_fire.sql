/*
  # Fix RLS Policies for Connections Table - Comprehensive Fix

  1. Drop all existing policies to start fresh
  2. Create proper policies for all operations (SELECT, INSERT, UPDATE, DELETE)
  3. Add a safe delete function that bypasses RLS
  4. Add debugging function to check permissions

  This migration fixes the RLS policy issues that prevent connection deletion.
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their connections" ON connections;
DROP POLICY IF EXISTS "Users can create connection requests" ON connections;
DROP POLICY IF EXISTS "Users can update connection requests" ON connections;
DROP POLICY IF EXISTS "Users can delete connections they are involved in" ON connections;
DROP POLICY IF EXISTS "Users can update connections they are involved in" ON connections;

-- Create comprehensive RLS policies

-- SELECT policy - users can view connections they're involved in
CREATE POLICY "connections_select_policy"
  ON connections FOR SELECT
  TO authenticated
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- INSERT policy - users can create connection requests
CREATE POLICY "connections_insert_policy"
  ON connections FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
  );

-- UPDATE policy - users can update connections they're involved in
CREATE POLICY "connections_update_policy"
  ON connections FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  )
  WITH CHECK (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- DELETE policy - users can delete connections they're involved in
CREATE POLICY "connections_delete_policy"
  ON connections FOR DELETE
  TO authenticated
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- Create a function to safely delete connections with proper permissions
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_connection_safely(uuid) TO authenticated;

-- Create a function to check connection permissions for debugging
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_connection_permissions(uuid) TO authenticated;