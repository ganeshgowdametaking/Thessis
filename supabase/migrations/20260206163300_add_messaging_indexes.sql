-- 1. Fix the timeout in connections
CREATE INDEX IF NOT EXISTS idx_connections_participants 
ON connections (requester_id, addressee_id);

-- 2. Fix the timeout in profile loading
CREATE INDEX IF NOT EXISTS idx_profiles_id_email 
ON profiles (id, email);

-- 3. Speed up the messages list
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages (conversation_id, created_at DESC);
