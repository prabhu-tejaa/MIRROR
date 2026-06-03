package com.mirror.memoryservice.domain.memory;
import com.mirror.memoryservice.infrastructure.config.RabbitMQConfig;
import com.mirror.memoryservice.domain.admin.AnalyticsResponseDTO;

import com.mirror.memoryservice.domain.memory.Memory;

import com.mirror.memoryservice.domain.memory.MemoryService;
import com.mirror.memoryservice.domain.ai.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {

    private final MemoryService service;
    private final org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public MemoryController(MemoryService service, org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.service = service;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Queues a new memory for the user. Processing happens asynchronously.
     */
    @PostMapping("/save")
    public ResponseEntity<String> saveMemory(
            java.security.Principal principal,
            @RequestBody String content
    ) {
        String userId = principal.getName();
        try {
            com.mirror.memoryservice.domain.memory.MemorySaveEvent event = new com.mirror.memoryservice.domain.memory.MemorySaveEvent(userId, content);
            String message = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend(RabbitMQConfig.MEMORY_SAVE_QUEUE, message);
            return ResponseEntity.accepted().body("Memory queued for processing.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to queue memory: " + e.getMessage());
        }
    }

    /**
     * Semantic reflection endpoint. Takes prompt, performs semantic pgvector cosine search
     * on user context memories, and returns structured context reflection + emotion tag.
     */
    @PostMapping("/reflect")
    public ResponseEntity<Map<String, String>> reflect(
            java.security.Principal principal,
            @RequestBody String prompt
    ) {
        String userId = principal.getName();
        Map<String, String> response = service.generateReflection(userId, prompt);
        return ResponseEntity.ok(response);
    }

    /**
     * Exposes emotional counts metrics for analytics telemetry plotting.
     */
    @GetMapping("/analytics")
    public ResponseEntity<com.mirror.memoryservice.domain.admin.AnalyticsResponseDTO> getAnalytics(
            java.security.Principal principal
    ) {
        String userId = principal.getName();
        com.mirror.memoryservice.domain.admin.AnalyticsResponseDTO analytics = service.getEmotionalAnalytics(userId);
        return ResponseEntity.ok(analytics);
    }

    /**
     * List all memories for the authenticated user.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Memory>> getAll(
            java.security.Principal principal
    ) {
        String userId = principal.getName();
        List<Memory> memories = service.getAllMemories(userId);
        return ResponseEntity.ok(memories);
    }

    /**
     * Cursor-based paginated chat history endpoint. Returns messages in newest-first order
     * with total count, hasMore flag, and nextCursor for infinite scroll support.
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory(
            java.security.Principal principal,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int size
    ) {
        String userId = principal.getName();
        Map<String, Object> result = service.getMemoriesPaginated(userId, cursor, size);
        return ResponseEntity.ok(result);
    }

    /**
     * Simple keep-alive diagnostic endpoint.
     */
    @GetMapping("/keepalive")
    public String keepAlive(
            java.security.Principal principal
    ) {
        String userId = principal.getName();
        try {
            long count = service.getMemoryCount(userId);
            return "Memory service is awake. Active records for user: " + count;
        } catch (Exception e) {
            return "Memory service database error: " + e.getMessage();
        }
    }
}