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
import com.mirror.memoryservice.exception.MemoryNotFoundException;
import com.mirror.memoryservice.exception.MemoryProcessingException;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mirror.memoryservice.dto.ReflectionSaveEvent;
import com.mirror.memoryservice.config.RabbitMQConfig;

@Service
public class MemoryServiceImpl implements MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryServiceImpl.class);
    private static final String CACHE_EMOTION_ANALYTICS = "emotionAnalytics";

    private final MemoryRepository repository;
    private final GeminiService geminiService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public MemoryServiceImpl(MemoryRepository repository, GeminiService geminiService, RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
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
            throw new MemoryProcessingException("Database error saving memory: " + e.getMessage(), e);
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
    public com.mirror.memoryservice.dto.AnalyticsResponseDTO getEmotionalAnalytics(String userId) {
        com.mirror.memoryservice.dto.AnalyticsResponseDTO response = new com.mirror.memoryservice.dto.AnalyticsResponseDTO();
        List<com.mirror.memoryservice.dto.EmotionStatDTO> stats = new ArrayList<>();
        long total = 0;

        try {
            List<Object[]> counts = repository.findEmotionCounts(userId);
            for (Object[] row : counts) {
                if (row.length == 2 && row[0] != null) {
                    String rawKey = row[0].toString();
                    Long count = ((Number) row[1]).longValue();
                    
                    com.mirror.memoryservice.dto.EmotionStatDTO stat = parseEmotionTag(rawKey);
                    stat.setCount(count);
                    stats.add(stat);
                    total += count;
                }
            }
        } catch (Exception e) {
            log.error("Error generating emotional analytics metrics: {}", e.getMessage(), e);
        }

        // Calculate percentages, dominant emotion, etc.
        String dominantEmotion = "CALM";
        long maxCount = 0;
        
        for (com.mirror.memoryservice.dto.EmotionStatDTO stat : stats) {
            if (total > 0) {
                stat.setPercentage((int) Math.round(((double) stat.getCount() / total) * 100));
            } else {
                stat.setPercentage(0);
            }
            if (stat.getCount() > maxCount) {
                maxCount = stat.getCount();
                dominantEmotion = stat.getKey(); // Frontend uses raw key to find it
            }
        }
        
        // Sort by count descending
        stats.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        
        // Active streak calculation
        int activeStreak = total == 0 ? 0 : Math.max(1, Math.min(12, (int) (total / 4) + 1));
        
        // Generate aura gradient
        String auraGradient = generateAuraGradient(stats, total);

        response.setTotalMemories(total);
        response.setDominantEmotion(dominantEmotion);
        response.setActiveStreak(activeStreak);
        response.setEmotionStats(stats);
        response.setAuraGradient(auraGradient);
        
        return response;
    }

    private com.mirror.memoryservice.dto.EmotionStatDTO parseEmotionTag(String rawTag) {
        com.mirror.memoryservice.dto.EmotionStatDTO dto = new com.mirror.memoryservice.dto.EmotionStatDTO();
        dto.setKey(rawTag);
        
        // Failsafe for completely broken or empty tags
        if (rawTag == null || rawTag.isEmpty()) {
            dto.setPillar("FEELINGS");
            dto.setName("Neutral");
            dto.setPrimaryColor("#7928ca");
            dto.setSecondaryColor("#ff0080");
            return dto;
        }

        String[] parts = rawTag.split("\\|");
        
        // We now enforce the strict LLM format: PILLAR|Emotion|PrimaryColor|SecondaryColor
        if (parts.length >= 4) {
            dto.setPillar(parts[0]);
            dto.setName(parts[1]);
            dto.setPrimaryColor(parts[2]);
            dto.setSecondaryColor(parts[3]);
        } else {
            // Failsafe just in case the DB has malformed data despite strict LLM constraints
            dto.setPillar("FEELINGS");
            dto.setName(parts.length > 0 ? parts[0] : "Neutral");
            dto.setPrimaryColor("#7928ca");
            dto.setSecondaryColor("#ff0080");
        }

        return dto;
    }

    private String generateAuraGradient(List<com.mirror.memoryservice.dto.EmotionStatDTO> stats, long total) {
        if (total == 0 || stats.isEmpty()) {
            return "transparent";
        }
        
        int currentPercent = 0;
        List<String> gradientParts = new ArrayList<>();
        
        for (com.mirror.memoryservice.dto.EmotionStatDTO stat : stats) {
            if (stat.getPercentage() > 0) {
                int nextPercent = currentPercent + stat.getPercentage();
                gradientParts.add(String.format("%s %d%% %d%%", stat.getPrimaryColor(), currentPercent, nextPercent));
                currentPercent = nextPercent;
            }
        }
        
        if (currentPercent < 100 && !gradientParts.isEmpty()) {
            gradientParts.add(String.format("%s %d%% 100%%", stats.get(0).getPrimaryColor(), currentPercent));
        }
        
        return "conic-gradient(" + String.join(", ", gradientParts) + ")";
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
        
        // 4. Async background save using RabbitMQ
        try {
            String detectedEmotion = aiResponse.getOrDefault("emotion", "NEUTRAL");
            String reflectionText = aiResponse.getOrDefault("reflection", "");
            
            ReflectionSaveEvent event = new ReflectionSaveEvent(userId, prompt, reflectionText, detectedEmotion);
            String message = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend(RabbitMQConfig.REFLECTION_SAVE_QUEUE, message);
            
            log.info("Successfully queued prompt and reflection for background async saving for user: {}", userId);
        } catch (Exception e) {
            log.error("Could not auto-save RAG interaction to RabbitMQ: {}", e.getMessage());
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
        Memory memory = repository.findById(id).orElseThrow(() -> new MemoryNotFoundException("Memory " + id + " not found"));
        
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
