-- Update delete_connection_safely to also clean up related notifications
-- This bypasses RLS issues where users can't delete each other's notifications

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

  -- 1. Delete any notifications related to this connection
  -- This is the crucial fix for the "persisting notification" issue
  DELETE FROM notifications 
  WHERE type = 'connection' 
  AND metadata->>'connection_id' = connection_id::text;
  
  -- 2. Delete the connection if the user is involved in it
  DELETE FROM connections 
  WHERE id = connection_id 
  AND (requester_id = current_user_id OR addressee_id = current_user_id);
  
  -- Get the number of deleted rows from the connections table
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return true if the connection was deleted, false otherwise
  RETURN deleted_count > 0;
END;
$$;

COMMENT ON FUNCTION delete_connection_safely(uuid) IS 'Safely deletes a connection and its associated notifications if the current user is involved in it';
