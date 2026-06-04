package com.mirror.memoryservice.config.jobs;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class DatabaseKeepAliveService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseKeepAliveService.class);

    private final JdbcTemplate jdbcTemplate;

    public DatabaseKeepAliveService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedRate = 240000)
    public void keepDatabaseAwake() {
        try {
            jdbcTemplate.execute("SELECT 1");
            
        } catch (Exception e) {
            log.error("Failed to ping database: {}", e.getMessage());
        }
    }
}
