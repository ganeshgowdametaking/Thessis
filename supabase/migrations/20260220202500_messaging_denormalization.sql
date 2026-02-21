-- MESSAGING PERFORMANCE: Denormalization Phase
-- Adding last message preview to conversations to eliminate expensive joins.

-- 1. Add denormalized columns
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
ADD COLUMN IF NOT EXISTS last_message_sender_id UUID REFERENCES profiles(id);

-- 2. Update the trigger function to handle these new fields
-- We replace the existing function with an expanded version
CREATE OR REPLACE FUNCTION handle_new_message_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation metadata atomically
    UPDATE conversations
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100), -- Store a preview (truncate if necessary)
        last_message_sender_id = NEW.sender_id,
        -- Un-hide for recipient
        deleted_by_p1 = CASE WHEN participant_2 = NEW.sender_id THEN FALSE ELSE deleted_by_p1 END,
        deleted_by_p2 = CASE WHEN participant_1 = NEW.sender_id THEN FALSE ELSE deleted_by_p2 END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing conversations (optional but recommended for consistency)
-- This query sets the preview for existing conversations based on their last message
UPDATE conversations c
SET 
    last_message_preview = LEFT(m.content, 100),
    last_message_sender_id = m.sender_id
FROM (
    SELECT DISTINCT ON (conversation_id) conversation_id, content, sender_id
    FROM messages
    ORDER BY conversation_id, created_at DESC
) m
WHERE c.id = m.conversation_id;

-- 4. Re-analyze
VACUUM ANALYZE conversations;
