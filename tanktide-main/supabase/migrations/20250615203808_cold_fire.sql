-- ========================================
-- CREATE MISSING CONVERSATION DELETION FUNCTION
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ========================================

-- Step 1: Create the main deletion function
CREATE OR REPLACE FUNCTION delete_conversation_with_messages(conv_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  conversation_record conversations%ROWTYPE;
  deleted_messages_count integer;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get the conversation record and verify it exists
  SELECT * INTO conversation_record 
  FROM conversations 
  WHERE id = conv_id;
  
  IF conversation_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Conversation already deleted or does not exist'
    );
  END IF;
  
  -- Check if user is a participant in the conversation
  IF conversation_record.participant_1 != current_user_id AND conversation_record.participant_2 != current_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to delete this conversation'
    );
  END IF;
  
  -- Step 1: Delete all messages in the conversation first
  DELETE FROM messages 
  WHERE conversation_id = conv_id;
  
  GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;
  
  -- Step 2: Delete the conversation
  DELETE FROM conversations 
  WHERE id = conv_id;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conversation deleted successfully',
    'deleted_messages', deleted_messages_count,
    'conversation_id', conv_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle any unexpected errors
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Step 2: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_conversation_with_messages(uuid) TO authenticated;

-- Step 3: Add helpful comment
COMMENT ON FUNCTION delete_conversation_with_messages(uuid) IS 
'Safely deletes a conversation and all its messages. Only conversation participants can delete conversations.';

-- Step 4: Test the function exists
SELECT 'Function created successfully!' as status;

-- Step 5: Verify function exists
SELECT 
    proname as function_name,
    pronargs as argument_count
FROM pg_proc 
WHERE proname = 'delete_conversation_with_messages';