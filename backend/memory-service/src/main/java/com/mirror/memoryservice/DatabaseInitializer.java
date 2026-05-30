package com.mirror.memoryservice;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting MIRROR database initialization...");
        // 1. Enable pgvector extension (graceful fallback if permissions are restricted)
        try {
            jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
            log.info("Successfully ensured pgvector extension is enabled.");
        } catch (Exception extEx) {
            log.warn("Could not execute CREATE EXTENSION vector: {}. Proceeding to table creation assuming it might already be enabled or supported.", extEx.getMessage());
        }

        // 2. Create memories table with vector capabilities if it does not exist
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS memories (" +
                "  id BIGSERIAL PRIMARY KEY," +
                "  user_id VARCHAR(255) NOT NULL," +
                "  content TEXT NOT NULL," +
                "  emotion VARCHAR(50) NOT NULL," +
                "  sender VARCHAR(50) DEFAULT 'user'," +
                "  embedding vector(768)," +
                "  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP" +
                ")"
            );
            
            // Execute migration in case the table already exists without the column
            jdbcTemplate.execute("ALTER TABLE memories ADD COLUMN IF NOT EXISTS sender VARCHAR(50) DEFAULT 'user'");
            jdbcTemplate.execute("ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(768)");
            log.info("Successfully ensured 'memories' table schema and migrations are active.");
        } catch (Exception tblEx) {
            log.error("Failed to create memories table or run migrations: {}", tblEx.getMessage(), tblEx);
        }

        // 3. Create HNSW Cosine Similarity search index if it does not exist
        try {
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING hnsw (embedding vector_cosine_ops)");
            log.info("Successfully ensured memories HNSW index is active.");
        } catch (Exception idxEx) {
            log.warn("Could not create HNSW index: {}. Semantic search will fallback to standard vector scans.", idxEx.getMessage());
        }
    }
}
