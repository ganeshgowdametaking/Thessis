-- Speed up the "Real Counts" query that is currently timing out
CREATE INDEX IF NOT EXISTS idx_connections_status_requester 
ON connections (status, requester_id);

CREATE INDEX IF NOT EXISTS idx_connections_status_addressee 
ON connections (status, addressee_id);

-- This allows the DB to count rows without scanning the whole table
VACUUM ANALYZE connections;
