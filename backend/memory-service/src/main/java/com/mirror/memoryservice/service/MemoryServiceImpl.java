package com.mirror.memoryservice.service;

import com.mirror.memoryservice.Memory;
import com.mirror.memoryservice.MemoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@Service
public class MemoryServiceImpl implements MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryServiceImpl.class);

    private final MemoryRepository repository;
    private final GeminiService geminiService;
    private final EmotionCacheService emotionCacheService;

    public MemoryServiceImpl(MemoryRepository repository, GeminiService geminiService, EmotionCacheService emotionCacheService) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.emotionCacheService = emotionCacheService;
    }

    @Override
    @Transactional
    public String saveMemory(String userId, String content, String emotion, String sender, float[] embedding) {
        try {
            String embeddingStr = formatVectorForSql(embedding);
            repository.saveMemoryWithEmbedding(userId, content, emotion, sender, embeddingStr);
            emotionCacheService.evict(userId);
            return "Memory successfully cataloged and indexed semantically.";
        } catch (Exception e) {
            log.error("Error saving memory to Postgres: {}", e.getMessage(), e);
            throw new RuntimeException("Database error saving memory: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Memory> getSimilarMemories(String userId, String prompt, int limit) {
        try {
            float[] queryEmbedding = geminiService.getEmbedding(prompt);
            String embeddingStr = formatVectorForSql(queryEmbedding);
            return repository.findSimilarMemories(userId, embeddingStr, limit);
        } catch (Exception e) {
            log.error("Error searching similar memories: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getEmotionalAnalytics(String userId) {
        Map<String, Long> cached = emotionCacheService.getAnalytics(userId);
        if (cached != null) {
            return cached;
        }
        Map<String, Long> analytics = new HashMap<>();
        try {
            List<Object[]> counts = repository.findEmotionCounts(userId);
            for (Object[] row : counts) {
                if (row.length == 2 && row[0] != null) {
                    String emotion = row[0].toString();
                    Long count = ((Number) row[1]).longValue();
                    analytics.put(emotion, count);
                }
            }
            emotionCacheService.putAnalytics(userId, analytics);
        } catch (Exception e) {
            log.error("Error generating emotional analytics metrics: {}", e.getMessage(), e);
        }
        return analytics;
    }

    @Override
    @Transactional
    public Map<String, String> generateReflection(String userId, String prompt) {
        // 1. Retrieve similar past memories (Cosine Similarity Search)
        List<Memory> pastMemories = getSimilarMemories(userId, prompt, 5);
        
        // 2. Build semantic RAG context
        StringBuilder contextBuilder = new StringBuilder();
        if (!pastMemories.isEmpty()) {
            for (int i = 0; i < pastMemories.size(); i++) {
                Memory m = pastMemories.get(i);
                contextBuilder.append(String.format("Memory %d: %s (Emotion tagged: %s)\n", i + 1, m.getContent(), m.getEmotion()));
            }
        } else {
            contextBuilder.append("No past memories recorded yet.");
        }

        // 3. Generate empathetic reflection + emotion tag using Gemini
        Map<String, String> aiResponse = geminiService.generateReflectionAndEmotion(prompt, contextBuilder.toString());
        
        // 4. Save both the user prompt (sender='user') and the Gemini reflection (sender='mirror')!
        try {
            // A. Save the user prompt (compute & store embedding vector)
            float[] promptEmbedding = geminiService.getEmbedding(prompt);
            String detectedEmotion = aiResponse.getOrDefault("emotion", "NEUTRAL");
            saveMemory(userId, prompt, detectedEmotion, "user", promptEmbedding);
            
            // B. Save the Gemini reflection reply (sender='mirror', embedding=null since we don't search comfort text)
            String reflectionText = aiResponse.getOrDefault("reflection", "");
            saveMemory(userId, reflectionText, detectedEmotion, "mirror", null);
            
            log.info("Successfully cataloged prompt and Gemini reply as memories for user: {}", userId);
        } catch (Exception e) {
            log.error("Could not auto-save RAG interaction to database: {}", e.getMessage());
        }

        return aiResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Memory> getAllMemories(String userId) {
        return repository.findAllByUserIdOrderByCreatedAtDescIdDesc(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMemoriesPaginated(String userId, int page, int size) {
        int offset = page * size;
        List<Memory> memories = repository.findMemoriesPaginated(userId, size, offset);
        long total = repository.countByUserId(userId);
        boolean hasMore = (offset + memories.size()) < total;

        Map<String, Object> result = new HashMap<>();
        result.put("messages", memories);
        result.put("total", total);
        result.put("hasMore", hasMore);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public long getMemoryCount(String userId) {
        return repository.countByUserId(userId);
    }

    /**
     * Converts a float[] vector array into standard Postgres pgvector string format: [0.1,0.2,...]
     */
    private String formatVectorForSql(float[] vector) {
        if (vector == null || vector.length == 0) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
