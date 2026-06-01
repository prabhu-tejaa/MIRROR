package com.mirror.memoryservice.service;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to cache the calculated emotional analytics of users to avoid redundant DB queries.
 * Cache is updated reactively when reflections/memories are saved.
 */
@Service
public class EmotionCacheService {

    private final Map<String, Map<String, Long>> cache = new ConcurrentHashMap<>();

    public Map<String, Long> getAnalytics(String userId) {
        return cache.get(userId);
    }

    public void putAnalytics(String userId, Map<String, Long> stats) {
        if (userId != null && stats != null) {
            cache.put(userId, stats);
        }
    }

    public void evict(String userId) {
        if (userId != null) {
            cache.remove(userId);
        }
    }

    public void clearAll() {
        cache.clear();
    }
}
