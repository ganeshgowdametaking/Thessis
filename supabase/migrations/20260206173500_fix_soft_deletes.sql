-- ABSOLUTE FIX: Soft Delete Schema Support
-- Run this entire block in the Supabase SQL Editor to fix the 400 Bad Request error.

-- 1. Add Soft Delete Columns
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS deleted_by_p1 BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS deleted_by_p2 BOOLEAN DEFAULT FALSE;

-- 2. Index the lookups
-- We use separate indexes for participant + flag which works efficiently with the .or() query
CREATE INDEX IF NOT EXISTS idx_conv_p1_deleted ON conversations (participant_1, deleted_by_p1);
CREATE INDEX IF NOT EXISTS idx_conv_p2_deleted ON conversations (participant_2, deleted_by_p2);

-- 3. Ensure Message Index is present (Crucial for 30s lag fix)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at 
ON messages (conversation_id, created_at DESC);

-- 4. Update the Query Planner
VACUUM ANALYZE conversations;
VACUUM ANALYZE messages;
