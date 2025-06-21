-- ========================================
-- FIX CONVERSATION DELETION FUNCTION
-- This fixes the ambiguous column reference error
-- ========================================

-- Drop the problematic function first
DROP FUNCTION IF EXISTS check_conversation_deletion_permissions(uuid);

-- Recreate the function with fixed column references
CREATE OR REPLACE FUNCTION check_conversation_deletion_permissions(conv_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  conversation_record conversations%ROWTYPE;
  messages_count integer;
  result jsonb;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Get the conversation record (using the parameter name conv_id to avoid ambiguity)
  SELECT * INTO conversation_record FROM conversations WHERE id = conv_id;
  
  -- Count messages in conversation (using the parameter name conv_id)
  SELECT COUNT(*) INTO messages_count FROM messages WHERE conversation_id = conv_id;
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'user_id', current_user_id,
    'conversation_exists', conversation_record.id IS NOT NULL,
    'conversation_id', conv_id,
    'participant_1', conversation_record.participant_1,
    'participant_2', conversation_record.participant_2,
    'is_participant_1', conversation_record.participant_1 = current_user_id,
    'is_participant_2', conversation_record.participant_2 = current_user_id,
    'can_delete', (conversation_record.participant_1 = current_user_id OR conversation_record.participant_2 = current_user_id),
    'messages_count', messages_count,
    'created_at', conversation_record.created_at,
    'last_message_at', conversation_record.last_message_at
  );
  
  RETURN result;
END;
$$;

-- Also fix the main deletion function to avoid similar issues
DROP FUNCTION IF EXISTS delete_conversation_with_messages(uuid);

CREATE OR REPLACE FUNCTION delete_conversation_with_messages(conv_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  conversation_record conversations%ROWTYPE;
  deleted_messages_count integer;
  result jsonb;
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
  
  -- Verify the conversation was deleted
  IF EXISTS (SELECT 1 FROM conversations WHERE id = conv_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversation deletion failed - conversation still exists after deletion attempt'
    );
  END IF;
  
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_conversation_with_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_conversation_deletion_permissions(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION delete_conversation_with_messages(uuid) IS 
'Safely deletes a conversation and all its messages. Only conversation participants can delete conversations.';

COMMENT ON FUNCTION check_conversation_deletion_permissions(uuid) IS 
'Checks conversation deletion permissions and provides debugging information. Fixed parameter naming to avoid ambiguity.';

-- Test the fixed function
SELECT 'Functions fixed successfully!' as status;

-- Test the permission check function with a dummy UUID (safe test)
SELECT check_conversation_deletion_permissions('00000000-0000-0000-0000-000000000000'::uuid) as test_result;