-- CRITICAL PERFORMANCE INDEXES
-- These indexes are required to fix the 30-second message loading delay.

-- 1. Index for fetching messages in a specific chat (The 30s killer)
-- Allows instant retrieval of chat history by conversation_id ordered by time
CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
ON messages (conversation_id, created_at DESC);

-- 2. Index for finding conversations by participants (The sidebar speedup)
-- Allows finding a conversation between two users instantly without scanning the whole table
CREATE INDEX IF NOT EXISTS idx_conversations_participants_composite 
ON conversations (participant_1, participant_2);

-- 3. Index for unread message counts
-- optimises the query: select count(*) from messages where conversation_id = ? and read = false and sender_id != ?
CREATE INDEX IF NOT EXISTS idx_messages_unread_lookup
ON messages (conversation_id, read, sender_id);

-- Analyze to ensure query planner uses them immediately
VACUUM ANALYZE messages;
VACUUM ANALYZE conversations;
