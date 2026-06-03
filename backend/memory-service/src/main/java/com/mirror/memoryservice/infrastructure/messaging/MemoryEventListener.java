package com.mirror.memoryservice.infrastructure.messaging;
import com.mirror.memoryservice.domain.ai.ReflectionSaveEvent;
import com.mirror.memoryservice.domain.ai.GeminiService;
import com.mirror.memoryservice.domain.ai.GroqService;
import com.mirror.memoryservice.domain.memory.MemoryService;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mirror.memoryservice.infrastructure.config.RabbitMQConfig;
import com.mirror.memoryservice.domain.memory.MemorySaveEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MemoryEventListener {

    private static final Logger log = LoggerFactory.getLogger(MemoryEventListener.class);
    private final MemoryService memoryService;
    private final GeminiService geminiService;
    private final GroqService groqService;
    private final ObjectMapper objectMapper;

    public MemoryEventListener(MemoryService memoryService, GeminiService geminiService, GroqService groqService, ObjectMapper objectMapper) {
        this.memoryService = memoryService;
        this.geminiService = geminiService;
        this.groqService = groqService;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.MEMORY_SAVE_QUEUE)
    public void handleMemorySaveEvent(String message) {
        try {
            MemorySaveEvent event = objectMapper.readValue(message, MemorySaveEvent.class);
            log.info("Processing async memory save for user: {}", event.userId());
            
            float[] embedding = geminiService.getEmbedding(event.content());
            Map<String, String> sentiment = groqService.generateReflectionAndEmotion(event.content(), null);
            String emotion = sentiment.getOrDefault("emotion", "NEUTRAL");
            
            memoryService.saveMemory(event.userId(), event.content(), emotion, "user", embedding);
            log.info("Successfully processed and saved memory for user: {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to process memory save event", e);
        }
    }
    @RabbitListener(queues = RabbitMQConfig.REFLECTION_SAVE_QUEUE)
    public void handleReflectionSaveEvent(String message) {
        try {
            com.mirror.memoryservice.domain.ai.ReflectionSaveEvent event = objectMapper.readValue(message, com.mirror.memoryservice.domain.ai.ReflectionSaveEvent.class);
            log.info("Processing async reflection background save for user: {}", event.userId());
            
            float[] promptEmbedding = geminiService.getEmbedding(event.prompt());
            
            memoryService.saveMemory(event.userId(), event.prompt(), event.emotion(), "user", promptEmbedding);
            
            memoryService.saveMemory(event.userId(), event.reflection(), event.emotion(), "mirror", null);
            
            log.info("Successfully processed and saved background reflection for user: {}", event.userId());
        } catch (Exception e) {
            log.error("Failed to process background reflection save event", e);
        }
    }
}
