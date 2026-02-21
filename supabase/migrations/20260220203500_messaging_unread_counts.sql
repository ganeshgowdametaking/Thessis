-- MESSAGING PERFORMANCE: Unread Count Optimization
-- Automating unread counts at the database level to ensure O(1) retrieval.

-- 1. Add unread count columns
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS unread_count_p1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_count_p2 INTEGER DEFAULT 0;

-- 2. Update the new message trigger to increment unread counts
CREATE OR REPLACE FUNCTION handle_new_message_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation metadata atomically
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        last_message_sender_id = NEW.sender_id,
        -- Un-hide for everyone (sender and recipient visibility flags)
        deleted_by_p1 = CASE WHEN participant_2 = NEW.sender_id THEN FALSE ELSE deleted_by_p1 END,
        deleted_by_p2 = CASE WHEN participant_1 = NEW.sender_id THEN FALSE ELSE deleted_by_p2 END,
        -- Increment unread count for the RECIPIENT
        unread_count_p1 = CASE WHEN participant_1 != NEW.sender_id THEN unread_count_p1 + 1 ELSE unread_count_p1 END,
        unread_count_p2 = CASE WHEN participant_2 != NEW.sender_id THEN unread_count_p2 + 1 ELSE unread_count_p2 END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a trigger to decrement unread counts when messages are marked as read
CREATE OR REPLACE FUNCTION handle_message_read_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if the 'read' status changed from FALSE to TRUE
    IF OLD.read = FALSE AND NEW.read = TRUE THEN
        UPDATE conversations
        SET 
            unread_count_p1 = CASE WHEN participant_1 = NEW.sender_id THEN unread_count_p1 ELSE GREATEST(0, unread_count_p1 - 1) END,
            unread_count_p2 = CASE WHEN participant_2 = NEW.sender_id THEN unread_count_p2 ELSE GREATEST(0, unread_count_p2 - 1) END
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_message_read ON messages;
CREATE TRIGGER tr_on_message_read
AFTER UPDATE OF read ON messages
FOR EACH ROW
WHEN (NEW.read = TRUE AND OLD.read = FALSE)
EXECUTE FUNCTION handle_message_read_update();

-- 4. Backfill existing unread counts
UPDATE conversations c
SET 
    unread_count_p1 = (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = FALSE AND m.sender_id != c.participant_1),
    unread_count_p2 = (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = FALSE AND m.sender_id != c.participant_2);
