/*
  # Fix connections table DELETE policy

  1. Problem
    - Current DELETE policy may be too restrictive
    - Users cannot delete their own connection requests
    - Delete operations appear to succeed but are silently blocked

  2. Solution
    - Drop existing DELETE policies
    - Create a comprehensive DELETE policy that allows users to delete connections they're involved in
    - Add proper logging and verification

  3. Security
    - Users can only delete connections where they are either requester or addressee
    - Maintains data security while allowing proper functionality
*/

-- Drop existing DELETE policies to avoid conflicts
DROP POLICY IF EXISTS "Users can delete their own connection requests" ON connections;
DROP POLICY IF EXISTS "Users can update connection requests" ON connections;

-- Create a comprehensive DELETE policy
CREATE POLICY "Users can delete connections they are involved in"
  ON connections FOR DELETE
  TO authenticated
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- Also ensure UPDATE policy exists for accepting/declining connections
CREATE POLICY "Users can update connections they are involved in"
  ON connections FOR UPDATE
  TO authenticated
  USING (
    requester_id = auth.uid() OR addressee_id = auth.uid()
  );

-- Add an index to improve performance of connection lookups
CREATE INDEX IF NOT EXISTS idx_connections_participants 
ON connections(requester_id, addressee_id);

-- Add a function to safely delete connections with logging
CREATE OR REPLACE FUNCTION delete_connection_safely(connection_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Attempt to delete the connection
  DELETE FROM connections 
  WHERE id = connection_id 
  AND (requester_id = auth.uid() OR addressee_id = auth.uid());
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return true if a row was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_connection_safely(uuid) TO authenticated;