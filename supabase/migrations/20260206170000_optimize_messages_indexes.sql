-- Add indexes to speed up message retrieval and conversation lookup

-- 1. Optimize fetching messages for a specific conversation (ordered by time)
-- This fixes the "30 second" load time for chat history
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON messages (conversation_id, created_at DESC);

-- 2. Optimize finding conversations between two users
-- This fixes the lookup when clicking "Message" from a profile
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 
ON conversations (participant_1);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 
ON conversations (participant_2);

-- Composite index for exact match lookups (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_conversations_participants_pair 
ON conversations (participant_1, participant_2);

-- 3. Optimize the main list of conversations for a user (ordered by recent activity)
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1_last_message 
ON conversations (participant_1, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_2_last_message 
ON conversations (participant_2, last_message_at DESC);

-- 4. Analyze tables to update query planner
VACUUM ANALYZE messages;
VACUUM ANALYZE conversations;
