package com.mirror.memoryservice.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class DatabaseKeepAliveService {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseKeepAliveService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // Ping the database every 4 minutes (240,000 milliseconds)
    // This prevents serverless databases like Neon from going to sleep
    @Scheduled(fixedRate = 240000)
    public void keepDatabaseAwake() {
        try {
            jdbcTemplate.execute("SELECT 1");
            log.debug("Sent keep-alive ping to database");
        } catch (Exception e) {
            log.error("Failed to ping database: {}", e.getMessage());
        }
    }
}
