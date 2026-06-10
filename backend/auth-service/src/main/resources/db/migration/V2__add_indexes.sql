-- V2__add_indexes.sql

-- Add missing indexes on foreign keys to prevent full table scans when looking up tokens by user
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_tokens (user_id);
