package com.mirror.memoryservice.memory.service;
import com.mirror.memoryservice.ai.service.GeminiService;
import com.mirror.memoryservice.ai.service.GroqService;
import com.mirror.memoryservice.admin.dto.EmotionStatDTO;
import com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO;

import com.mirror.memoryservice.memory.model.Memory;
import com.mirror.memoryservice.memory.model.UserProfile;
import com.mirror.memoryservice.memory.repository.MemoryRepository;
import com.mirror.memoryservice.memory.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import com.mirror.memoryservice.common.exception.MemoryNotFoundException;
import com.mirror.memoryservice.common.exception.MemoryProcessingException;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mirror.memoryservice.ai.event.ReflectionSaveEvent;
import com.mirror.memoryservice.config.messaging.RabbitMQConfig;

@Service
public class MemoryServiceImpl implements MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryServiceImpl.class);
    private static final String CACHE_EMOTION_ANALYTICS = "emotionAnalytics";

    private final MemoryRepository repository;
    private final GeminiService geminiService;
    private final GroqService groqService;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;
    private final UserProfileRepository userProfileRepository;

    public MemoryServiceImpl(MemoryRepository repository, GeminiService geminiService, GroqService groqService, RabbitTemplate rabbitTemplate, ObjectMapper objectMapper, UserProfileRepository userProfileRepository) {
        this.repository = repository;
        this.geminiService = geminiService;
        this.groqService = groqService;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
        this.userProfileRepository = userProfileRepository;
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

    private static class EmotionGroupingResult {
        List<com.mirror.memoryservice.admin.dto.EmotionStatDTO> groupedStats;
        Map<String, String> mapping;
        long total;
    }

    private int[] parseColorToRgb(String color) {
        if (color == null) return new int[]{0,0,0};
        if (color.startsWith("#") && color.length() >= 7) {
            try {
                return new int[]{
                    Integer.valueOf(color.substring(1, 3), 16),
                    Integer.valueOf(color.substring(3, 5), 16),
                    Integer.valueOf(color.substring(5, 7), 16)
                };
            } catch (Exception e) {}
        }
        return new int[]{0,0,0};
    }

    private double colorDistance(String c1, String c2) {
        int[] rgb1 = parseColorToRgb(c1);
        int[] rgb2 = parseColorToRgb(c2);
        return Math.sqrt(Math.pow(rgb1[0] - rgb2[0], 2) + Math.pow(rgb1[1] - rgb2[1], 2) + Math.pow(rgb1[2] - rgb2[2], 2));
    }

    private EmotionGroupingResult getGroupedEmotions(String userId) {
        List<Object[]> counts = repository.findEmotionCounts(userId);
        List<com.mirror.memoryservice.admin.dto.EmotionStatDTO> rawStats = new ArrayList<>();
        long total = 0;
        
        for (Object[] row : counts) {
            if (row.length == 2 && row[0] != null) {
                String rawKey = row[0].toString();
                Long count = ((Number) row[1]).longValue();
                com.mirror.memoryservice.admin.dto.EmotionStatDTO stat = parseEmotionTag(rawKey);
                stat.setCount(count);
                rawStats.add(stat);
                total += count;
            }
        }
        
        rawStats.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        
        List<com.mirror.memoryservice.admin.dto.EmotionStatDTO> groupedStats = new ArrayList<>();
        Map<String, String> mapping = new HashMap<>();
        int COLOR_THRESHOLD = 60;
        
        for (com.mirror.memoryservice.admin.dto.EmotionStatDTO stat : rawStats) {
            boolean merged = false;
            for (com.mirror.memoryservice.admin.dto.EmotionStatDTO group : groupedStats) {
                boolean nameMatch = stat.getName() != null && group.getName() != null && 
                                    stat.getName().trim().equalsIgnoreCase(group.getName().trim());
                boolean colorMatch = colorDistance(stat.getPrimaryColor(), group.getPrimaryColor()) < COLOR_THRESHOLD;
                
                if (nameMatch || colorMatch) {
                    mapping.put(stat.getKey(), group.getKey());
                    group.setCount(group.getCount() + stat.getCount());
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                groupedStats.add(stat);
                mapping.put(stat.getKey(), stat.getKey());
            }
        }
        
        EmotionGroupingResult result = new EmotionGroupingResult();
        result.groupedStats = groupedStats;
        result.mapping = mapping;
        result.total = total;
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = CACHE_EMOTION_ANALYTICS, key = "#userId")
    public com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO getEmotionalAnalytics(String userId) {
        com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO response = new com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO();
        
        EmotionGroupingResult grouping = getGroupedEmotions(userId);
        List<com.mirror.memoryservice.admin.dto.EmotionStatDTO> stats = grouping.groupedStats;
        long total = grouping.total;

        String dominantEmotion = "CALM";
        long maxCount = 0;
        
        for (com.mirror.memoryservice.admin.dto.EmotionStatDTO stat : stats) {
            if (total > 0) {
                stat.setPercentage((int) Math.round(((double) stat.getCount() / total) * 100));
            } else {
                stat.setPercentage(0);
            }
            if (stat.getCount() > maxCount) {
                maxCount = stat.getCount();
                dominantEmotion = stat.getKey();
            }
        }
        
        stats.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        
        int activeStreak = total == 0 ? 0 : Math.max(1, Math.min(12, (int) (total / 4) + 1));
        
        String auraGradient = generateAuraGradient(stats, total);

        response.setTotalMemories(total);
        response.setDominantEmotion(dominantEmotion);
        response.setActiveStreak(activeStreak);
        response.setEmotionStats(stats);
        response.setAuraGradient(auraGradient);
        
        return response;
    }

    private com.mirror.memoryservice.admin.dto.EmotionStatDTO parseEmotionTag(String rawTag) {
        com.mirror.memoryservice.admin.dto.EmotionStatDTO dto = new com.mirror.memoryservice.admin.dto.EmotionStatDTO();
        dto.setKey(rawTag);
        
        if (rawTag == null || rawTag.isEmpty()) {
            dto.setPillar("FEELINGS");
            dto.setName("Neutral");
            dto.setPrimaryColor("#7928ca");
            dto.setSecondaryColor("#ff0080");
            return dto;
        }

        String[] parts = rawTag.split("\\|");
        
        if (parts.length >= 4) {
            dto.setPillar(parts[0]);
            dto.setName(parts[1]);
            dto.setPrimaryColor(parts[2]);
            dto.setSecondaryColor(parts[3]);
        } else {
            dto.setPillar("FEELINGS");
            dto.setName(parts.length > 0 ? parts[0] : "Neutral");
            dto.setPrimaryColor("#7928ca");
            dto.setSecondaryColor("#ff0080");
        }

        return dto;
    }

    private String generateAuraGradient(List<com.mirror.memoryservice.admin.dto.EmotionStatDTO> stats, long total) {
        if (total == 0 || stats.isEmpty()) {
            return "transparent";
        }
        
        int currentPercent = 0;
        List<String> gradientParts = new ArrayList<>();
        
        for (com.mirror.memoryservice.admin.dto.EmotionStatDTO stat : stats) {
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
        // 1. Long-term memory (Semantic Search)
        List<Memory> pastMemories = getSimilarMemories(userId, prompt, 5);
        StringBuilder semanticContextBuilder = new StringBuilder();
        if (!pastMemories.isEmpty()) {
            for (int i = 0; i < pastMemories.size(); i++) {
                Memory m = pastMemories.get(i);
                String friendlyEmotionName = parseEmotionTag(m.getEmotion()).getName();
                semanticContextBuilder.append(String.format("Memory %d: %s (Emotion tagged: %s)\n", i + 1, m.getContent(), friendlyEmotionName));
            }
        } else {
            semanticContextBuilder.append("No relevant past memories found.");
        }

        // 2. Short-term memory (Chronological Recent Chat)
        List<Memory> recentMemoriesRaw = repository.findMemoriesKeysetPaginated(userId, 5, null);
        List<Memory> recentMemories = new ArrayList<>(recentMemoriesRaw);
        Collections.reverse(recentMemories); // Reverse so oldest is first, newest is last
        
        // 3. Time Awareness
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        String timeElapsedStr = "This is the first interaction.";
        if (!recentMemoriesRaw.isEmpty()) {
            ZonedDateTime lastTime = recentMemoriesRaw.get(0).getCreatedAt().atZone(ZoneId.systemDefault());
            long hours = ChronoUnit.HOURS.between(lastTime, now);
            if (hours > 24) {
                timeElapsedStr = (hours / 24) + " days ago.";
            } else if (hours > 0) {
                timeElapsedStr = hours + " hours ago.";
            } else {
                long minutes = ChronoUnit.MINUTES.between(lastTime, now);
                timeElapsedStr = minutes + " minutes ago.";
            }
        }
        
        // 4. Emotional & Profile Awareness
        com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO analytics = getEmotionalAnalytics(userId);
        UserProfile profile = userProfileRepository.findById(userId).orElse(null);

        StringBuilder recentContextBuilder = new StringBuilder();
        recentContextBuilder.append("--- SYSTEM REALITY CONTEXT ---\n");
        recentContextBuilder.append("Current Time: ").append(now.format(DateTimeFormatter.ofPattern("EEEE, hh:mm a"))).append("\n");
        recentContextBuilder.append("Time since last interaction: ").append(timeElapsedStr).append("\n");
        recentContextBuilder.append("User's Recent Dominant Emotion: ").append(analytics.getDominantEmotion() != null ? analytics.getDominantEmotion() : "UNKNOWN").append("\n");
        if (profile != null && profile.getCoreFacts() != null && !profile.getCoreFacts().isBlank()) {
            recentContextBuilder.append("Known User Facts: ").append(profile.getCoreFacts()).append("\n");
        }
        recentContextBuilder.append("\n");

        if (!recentMemories.isEmpty()) {
            for (Memory m : recentMemories) {
                String senderStr = m.getSender().equalsIgnoreCase("mirror") ? "Mirror" : "User";
                recentContextBuilder.append(String.format("%s: %s\n", senderStr, m.getContent()));
            }
        } else {
            recentContextBuilder.append("No recent chat history.");
        }

        Map<String, String> aiResponse = groqService.generateReflectionAndEmotion(prompt, recentContextBuilder.toString(), semanticContextBuilder.toString());
        
        try {
            String detectedEmotion = aiResponse.getOrDefault("emotion", "NEUTRAL");
            String reflectionText = aiResponse.getOrDefault("reflection", "");
            
            ReflectionSaveEvent event = new ReflectionSaveEvent(userId, prompt, reflectionText, detectedEmotion);
            String message = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend(RabbitMQConfig.REFLECTION_SAVE_QUEUE, message);

        } catch (Exception e) {
            log.error("Could not auto-save RAG interaction to RabbitMQ: {}", e.getMessage());
        }

        return aiResponse;
    }

    private List<Memory> mapMemoriesWithGroupedEmotions(String userId, List<Memory> memories) {
        Map<String, String> mapping = getGroupedEmotions(userId).mapping;
        List<Memory> mapped = new ArrayList<>();
        for (Memory m : memories) {
            Memory newMem = new Memory(m.getId(), m.getUserId(), m.getContent(), m.getEmotion(), m.getSender(), m.getEmbedding(), m.getCreatedAt());
            newMem.setEmotion(mapping.getOrDefault(m.getEmotion(), m.getEmotion()));
            newMem.setOriginalEmotionName(parseEmotionTag(m.getEmotion()).getName());
            mapped.add(newMem);
        }
        return mapped;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Memory> getAllMemories(String userId) {
        List<Memory> memories = repository.findAllByUserIdOrderByCreatedAtDescIdDesc(userId);
        return mapMemoriesWithGroupedEmotions(userId, memories);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getMemoriesPaginated(String userId, Long cursor, int size) {
        List<Memory> memories = repository.findMemoriesKeysetPaginated(userId, size, cursor);
        memories = mapMemoriesWithGroupedEmotions(userId, memories);
        
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
    @Transactional
    @CacheEvict(value = CACHE_EMOTION_ANALYTICS, key = "#userId")
    public void updateMemory(Long id, String userId, String content, String emotion) {
        Memory memory = repository.findById(id).orElseThrow(() -> new MemoryNotFoundException("Memory " + id + " not found"));
        
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

    @Override
    @Transactional
    @CacheEvict(value = CACHE_EMOTION_ANALYTICS, key = "#userId")
    public void deleteAllMemoriesForUser(String userId) {
        log.info("Deleting all memories for user: {}", userId);
        repository.deleteByUserId(userId);
    }

    private String formatVectorForSql(float[] vector) {
        if (vector == null || vector.length == 0) {
            return null;
        }
        return java.util.Arrays.toString(vector);
    }
}
