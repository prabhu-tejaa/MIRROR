-- V2__add_analytics_index.sql

-- Add composite index to speed up emotional analytics dashboard queries
CREATE INDEX IF NOT EXISTS idx_memories_user_emotion ON memories(user_id, emotion);
