-- 1. Add columns to allow independent deletion for both users
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS deleted_by_p1 BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS deleted_by_p2 BOOLEAN DEFAULT FALSE;

-- 2. Performance: Add composite indexes for filtered lookups (Sidebar load speed)
-- Faster than single indexes because it covers both the user check and the deletion flag
CREATE INDEX IF NOT EXISTS idx_conv_deletion_p1 ON conversations (participant_1, deleted_by_p1);
CREATE INDEX IF NOT EXISTS idx_conv_deletion_p2 ON conversations (participant_2, deleted_by_p2);

-- 3. Optimization: Ensure the message sort index exists (Fixes 30s lag)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON messages (conversation_id, created_at DESC);

-- 4. Analyze to ensure query planner sees the new columns
VACUUM ANALYZE conversations;
