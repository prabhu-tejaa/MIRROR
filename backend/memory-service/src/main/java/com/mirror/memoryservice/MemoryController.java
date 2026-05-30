package com.mirror.memoryservice;

import com.mirror.memoryservice.service.MemoryService;
import com.mirror.memoryservice.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {

    private final MemoryService service;
    private final GeminiService geminiService;

    public MemoryController(MemoryService service, GeminiService geminiService) {
        this.service = service;
        this.geminiService = geminiService;
    }

    /**
     * Saves a new memory for the user. Automatically tag it with sentiment and embeddings.
     */
    @PostMapping("/save")
    public ResponseEntity<String> saveMemory(
            @RequestHeader(value = "X-User-Email", defaultValue = "guest@mirror.com") String userId,
            @RequestBody String content
    ) {
        float[] embedding = geminiService.getEmbedding(content);
        Map<String, String> sentiment = geminiService.generateReflectionAndEmotion(content, null);
        String emotion = sentiment.getOrDefault("emotion", "NEUTRAL");
        
        String result = service.saveMemory(userId, content, emotion, "user", embedding);
        return ResponseEntity.ok(result);
    }

    /**
     * Semantic reflection endpoint. Takes prompt, performs semantic pgvector cosine search
     * on user context memories, and returns structured context reflection + emotion tag.
     */
    @PostMapping("/reflect")
    public ResponseEntity<Map<String, String>> reflect(
            @RequestHeader(value = "X-User-Email", defaultValue = "guest@mirror.com") String userId,
            @RequestBody String prompt
    ) {
        Map<String, String> response = service.generateReflection(userId, prompt);
        return ResponseEntity.ok(response);
    }

    /**
     * Exposes emotional counts metrics for analytics telemetry plotting.
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Long>> getAnalytics(
            @RequestHeader(value = "X-User-Email", defaultValue = "guest@mirror.com") String userId
    ) {
        Map<String, Long> analytics = service.getEmotionalAnalytics(userId);
        return ResponseEntity.ok(analytics);
    }

    /**
     * List all memories for the authenticated user.
     */
    @GetMapping("/all")
    public ResponseEntity<List<Memory>> getAll(
            @RequestHeader(value = "X-User-Email", defaultValue = "guest@mirror.com") String userId
    ) {
        List<Memory> memories = service.getAllMemories(userId);
        return ResponseEntity.ok(memories);
    }

    /**
     * Paginated chat history endpoint. Returns messages in newest-first order
     * with total count and hasMore flag for infinite scroll support.
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory(
            @RequestHeader(value = "X-User-Email", defaultValue = "guest@mirror.com") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Map<String, Object> result = service.getMemoriesPaginated(userId, page, size);
        return ResponseEntity.ok(result);
    }

    /**
     * Simple keep-alive diagnostic endpoint.
     */
    @GetMapping("/keepalive")
    public String keepAlive(
            @RequestHeader(value = "X-User-Email", defaultValue = "guest@mirror.com") String userId
    ) {
        try {
            long count = service.getMemoryCount(userId);
            return "Memory service is awake. Active records for user: " + count;
        } catch (Exception e) {
            return "Memory service database error: " + e.getMessage();
        }
    }
}