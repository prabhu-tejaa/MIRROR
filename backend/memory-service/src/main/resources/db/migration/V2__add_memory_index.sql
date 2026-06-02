-- V2__add_memory_index.sql

-- Add a composite index on (user_id, id) to optimize descending history queries.
CREATE INDEX IF NOT EXISTS memories_user_id_id_idx ON memories (user_id, id DESC);
