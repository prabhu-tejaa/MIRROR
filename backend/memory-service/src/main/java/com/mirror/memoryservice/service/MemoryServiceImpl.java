package com.mirror.memoryservice.service;

import com.mirror.memoryservice.model.Memory;
import com.mirror.memoryservice.repository.MemoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@Service
public class MemoryServiceImpl implements MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryServiceImpl.class);
    private static final String CACHE_EMOTION_ANALYTICS = "emotionAnalytics";

    private final MemoryRepository repository;
    private final GeminiService geminiService;

    public MemoryServiceImpl(MemoryRepository repository, GeminiService geminiService) {
        this.repository = repository;
        this.geminiService = geminiService;
    }

    @Override
    @Transactional
    @CacheEvict(value = CACHE_EMOTION_ANALYTICS, key = "#userId")
    public String saveMemory(String userId, String content, String emotion, String sender, float[] embedding) {
        try {
            String embeddingStr = formatVectorForSql(embedding);
            repository.saveMemoryWithEmbedding(userId, content, emotion, sender, embeddingStr);
            return "Memory successfully cataloged and indexed semantically.";
        } catch (Exception e) {
            log.error("Error saving memory to Postgres: {}", e.getMessage(), e);
            throw new RuntimeException("Database error saving memory: " + e.getMessage());
        }
    }

    @Override
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
    @Cacheable(value = CACHE_EMOTION_ANALYTICS, key = "#userId")
    public Map<String, Long> getEmotionalAnalytics(String userId) {
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
        } catch (Exception e) {
            log.error("Error generating emotional analytics metrics: {}", e.getMessage(), e);
        }
        return analytics;
    }

    @Override
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
    public Map<String, Object> getMemoriesPaginated(String userId, Long cursor, int size) {
        List<Memory> memories = repository.findMemoriesKeysetPaginated(userId, size, cursor);
        
        Long total = null;
        if (cursor == null) {
            total = repository.countByUserId(userId);
        }
        
        boolean hasMore = memories.size() == size;
        Long nextCursor = memories.isEmpty() ? null : memories.get(memories.size() - 1).getId();

        Map<String, Object> result = new HashMap<>();
        result.put("messages", memories);
        if (total != null) {
            result.put("total", total);
        }
        result.put("hasMore", hasMore);
        result.put("nextCursor", nextCursor);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public long getMemoryCount(String userId) {
        return repository.countByUserId(userId);
    }

    @Override
    @Transactional
    public void deleteMemory(Long id) {
        repository.deleteById(id);
    }

    @Override
    @CacheEvict(value = CACHE_EMOTION_ANALYTICS, key = "#userId")
    public void updateMemory(Long id, String userId, String content, String emotion) {
        Memory memory = repository.findById(id).orElseThrow(() -> new RuntimeException("Memory not found"));
        
        // If content changes, regenerate embedding
        if (!memory.getContent().equals(content)) {
            float[] newEmbedding = geminiService.getEmbedding(content);
            String embeddingStr = "[" + java.util.stream.IntStream.range(0, newEmbedding.length)
                    .mapToObj(i -> String.valueOf(newEmbedding[i]))
                    .collect(java.util.stream.Collectors.joining(",")) + "]";
            memory.setEmbedding(embeddingStr);
        }
        
        memory.setUserId(userId);
        memory.setContent(content);
        memory.setEmotion(emotion);
        repository.save(memory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Memory> getAllMemoriesAdmin() {
        return repository.findAll();
    }

    /**
     * Converts a float[] vector array into standard Postgres pgvector string format: [0.1,0.2,...]
     */
    private String formatVectorForSql(float[] vector) {
        if (vector == null || vector.length == 0) {
            return null;
        }
        return java.util.Arrays.toString(vector);
    }
}
