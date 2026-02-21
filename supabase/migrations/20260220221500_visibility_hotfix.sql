-- MESSAGING HOTFIX: Bidirectional Visibility
-- This ensures that when a new message is sent, the conversation becomes visible to BOTH participants.

CREATE OR REPLACE FUNCTION handle_new_message_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        last_message_sender_id = NEW.sender_id,
        -- UN-HIDE FOR EVERYONE:
        -- If a new message exists, the thread should be visible to both parties,
        -- regardless of who sent it or who previously deleted it.
        deleted_by_p1 = FALSE,
        deleted_by_p2 = FALSE,
        -- Increment unread count for the RECIPIENT ONLY
        unread_count_p1 = CASE WHEN participant_1 != NEW.sender_id THEN unread_count_p1 + 1 ELSE unread_count_p1 END,
        unread_count_p2 = CASE WHEN participant_2 != NEW.sender_id THEN unread_count_p2 + 1 ELSE unread_count_p2 END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-run the backfill for any chats that might be missing previews
UPDATE conversations c
SET 
    last_message_at = m.created_at,
    last_message_preview = LEFT(m.content, 100),
    last_message_sender_id = m.sender_id
FROM (
    SELECT DISTINCT ON (conversation_id) conversation_id, content, sender_id, created_at
    FROM messages
    ORDER BY conversation_id, created_at DESC
) m
WHERE c.id = m.conversation_id 
AND (c.last_message_preview IS NULL OR c.last_message_at IS NULL);

ANALYZE conversations;
ANALYZE messages;
