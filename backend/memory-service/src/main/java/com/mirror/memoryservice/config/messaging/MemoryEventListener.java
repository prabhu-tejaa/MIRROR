package com.mirror.memoryservice.config.messaging;
import com.mirror.memoryservice.ai.event.ReflectionSaveEvent;
import com.mirror.memoryservice.ai.service.GeminiService;
import com.mirror.memoryservice.ai.service.GroqService;
import com.mirror.memoryservice.memory.service.MemoryService;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mirror.memoryservice.config.messaging.RabbitMQConfig;
import com.mirror.memoryservice.memory.event.MemorySaveEvent;
import com.mirror.memoryservice.memory.model.UserProfile;
import com.mirror.memoryservice.memory.repository.UserProfileRepository;
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
    private final UserProfileRepository userProfileRepository;

    public MemoryEventListener(MemoryService memoryService, GeminiService geminiService, GroqService groqService, ObjectMapper objectMapper, UserProfileRepository userProfileRepository) {
        this.memoryService = memoryService;
        this.geminiService = geminiService;
        this.groqService = groqService;
        this.objectMapper = objectMapper;
        this.userProfileRepository = userProfileRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.MEMORY_SAVE_QUEUE)
    public void handleMemorySaveEvent(String message) {
        try {
            MemorySaveEvent event = objectMapper.readValue(message, MemorySaveEvent.class);

            float[] embedding = geminiService.getEmbedding(event.content());
            Map<String, String> sentiment = groqService.generateReflectionAndEmotion(event.content(), null, null);
            String emotion = sentiment.getOrDefault("emotion", "NEUTRAL");
            
            memoryService.saveMemory(event.userId(), event.content(), emotion, "user", embedding);
            
            // Extract and update user profile facts
            UserProfile profile = userProfileRepository.findById(event.userId()).orElse(new UserProfile(event.userId(), null));
            String updatedFacts = groqService.extractAndMergeFacts(event.content(), profile.getCoreFacts());
            profile.setCoreFacts(updatedFacts);
            userProfileRepository.save(profile);
            
        } catch (Exception e) {
            log.error("Failed to process memory save event", e);
        }
    }
    @RabbitListener(queues = RabbitMQConfig.REFLECTION_SAVE_QUEUE)
    public void handleReflectionSaveEvent(String message) {
        try {
            com.mirror.memoryservice.ai.event.ReflectionSaveEvent event = objectMapper.readValue(message, com.mirror.memoryservice.ai.event.ReflectionSaveEvent.class);

            float[] promptEmbedding = geminiService.getEmbedding(event.prompt());
            
            memoryService.saveMemory(event.userId(), event.prompt(), event.emotion(), "user", promptEmbedding);
            
            memoryService.saveMemory(event.userId(), event.reflection(), event.emotion(), "mirror", null);

            UserProfile profile = userProfileRepository.findById(event.userId()).orElse(new UserProfile(event.userId(), null));
            String updatedFacts = groqService.extractAndMergeFacts(event.prompt(), profile.getCoreFacts());
            profile.setCoreFacts(updatedFacts);
            userProfileRepository.save(profile);

        } catch (Exception e) {
            log.error("Failed to process background reflection save event", e);
        }
    }

    @RabbitListener(queues = RabbitMQConfig.USER_DELETE_QUEUE)
    public void handleUserDeleteEvent(String username) {
        try {
            log.info("Received user deletion event for username: {}", username);
            memoryService.deleteAllMemoriesForUser(username);
        } catch (Exception e) {
            log.error("Failed to process user delete event", e);
        }
    }
}
