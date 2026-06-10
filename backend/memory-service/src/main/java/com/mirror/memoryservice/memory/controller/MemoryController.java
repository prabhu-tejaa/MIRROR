package com.mirror.memoryservice.memory.controller;
import com.mirror.memoryservice.memory.event.MemorySaveEvent;
import com.mirror.memoryservice.config.messaging.RabbitMQConfig;
import com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO;

import com.mirror.memoryservice.memory.model.Memory;

import com.mirror.memoryservice.memory.service.MemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/memory")
@Validated
public class MemoryController {

    private final MemoryService service;
    private final org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public MemoryController(MemoryService service, org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.service = service;
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/save")
    public ResponseEntity<String> saveMemory(
            java.security.Principal principal,
            @NotBlank(message = "content cannot be empty") @RequestBody String content
    ) {
        String userId = principal.getName();
        try {
            com.mirror.memoryservice.memory.event.MemorySaveEvent event = new com.mirror.memoryservice.memory.event.MemorySaveEvent(userId, content);
            String message = objectMapper.writeValueAsString(event);
            rabbitTemplate.convertAndSend(RabbitMQConfig.MEMORY_SAVE_QUEUE, message);
            return ResponseEntity.accepted().body("Memory queued for processing.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to queue memory: " + e.getMessage());
        }
    }

    @PostMapping("/reflect")
    public ResponseEntity<Map<String, String>> reflect(
            java.security.Principal principal,
            @NotBlank(message = "prompt cannot be empty") @RequestBody String prompt
    ) {
        String userId = principal.getName();
        Map<String, String> response = service.generateReflection(userId, prompt);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics")
    public ResponseEntity<com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO> getAnalytics(
            java.security.Principal principal
    ) {
        String userId = principal.getName();
        com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO analytics = service.getEmotionalAnalytics(userId);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Memory>> getAll(
            java.security.Principal principal
    ) {
        String userId = principal.getName();
        List<Memory> memories = service.getAllMemories(userId);
        return ResponseEntity.ok(memories);
    }

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

    @GetMapping("/keepalive")
    public String keepAlive(
            java.security.Principal principal
    ) {
        if (principal == null) {
            return "Memory service is awake.";
        }
        String userId = principal.getName();
        try {
            long count = service.getMemoryCount(userId);
            return "Memory service is awake. Active records for user: " + count;
        } catch (Exception e) {
            return "Memory service database error: " + e.getMessage();
        }
    }
}