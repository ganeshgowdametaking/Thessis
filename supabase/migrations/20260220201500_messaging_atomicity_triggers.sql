-- MESSAGING ATOMICITY: Automated Metadata Updates
-- This eliminates the need for the client to manually update conversation timestamps.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_message_metadata()
RETURNS TRIGGER AS $$
DECLARE
    is_p1 BOOLEAN;
BEGIN
    -- Determine which participant sent the message and update 'last_message_at'
    -- Also un-hide the conversation for the RECIPIENT if it was soft-deleted.
    
    -- Fetch which participant is which for the current conversation
    -- We use a locked fetch to ensure atomicity in high-concurrency environments
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        -- If participant 1 sent it, ensure it's visible to participant 2
        -- If participant 2 sent it, ensure it's visible to participant 1
        deleted_by_p1 = CASE WHEN participant_2 = NEW.sender_id THEN FALSE ELSE deleted_by_p1 END,
        deleted_by_p2 = CASE WHEN participant_1 = NEW.sender_id THEN FALSE ELSE deleted_by_p2 END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_on_message_inserted ON messages;
CREATE TRIGGER tr_on_message_inserted
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION handle_new_message_metadata();

-- 3. Cleanup: Analyze to optimize
VACUUM ANALYZE messages;
VACUUM ANALYZE conversations;
