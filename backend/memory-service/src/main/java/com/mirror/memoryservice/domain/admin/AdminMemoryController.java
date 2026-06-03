package com.mirror.memoryservice.domain.admin;

import com.mirror.memoryservice.domain.memory.Memory;

import com.mirror.memoryservice.domain.memory.MemoryService;
import com.mirror.memoryservice.domain.ai.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/admin/memory")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMemoryController {

    private static final Logger log = LoggerFactory.getLogger(AdminMemoryController.class);
    private final MemoryService memoryService;
    private final GeminiService geminiService;

    public AdminMemoryController(MemoryService memoryService, GeminiService geminiService) {
        this.memoryService = memoryService;
        this.geminiService = geminiService;
    }

    @GetMapping("/all")
    public ResponseEntity<List<Memory>> getAllMemories() {
        return ResponseEntity.ok(memoryService.getAllMemoriesAdmin());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteMemory(@PathVariable Long id) {
        try {
            memoryService.deleteMemory(id);
            return ResponseEntity.ok("Memory " + id + " deleted successfully.");
        } catch (Exception e) {
            log.error("Failed to delete memory {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().body("Error deleting memory: " + e.getMessage());
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadMockData(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty.");
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            int count = 0;
            boolean isFirstLine = true;
            
            while ((line = reader.readLine()) != null) {
                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }
                
                String[] parts = line.split(",");
                if (parts.length >= 3) {
                    String userId = parts[0].trim();
                    String content = parts[1].trim();
                    String emotion = parts[2].trim();
                    
                    float[] embedding = geminiService.getEmbedding(content);
                    memoryService.saveMemory(userId, content, emotion, "user", embedding);
                    count++;
                }
            }
            return ResponseEntity.ok("Successfully imported " + count + " records into the database.");
            
        } catch (Exception e) {
            log.error("Error processing mock data upload: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error processing file: " + e.getMessage());
        }
    }
    @PostMapping
    public ResponseEntity<String> createMemory(@RequestBody MemoryRequest request) {
        try {
            float[] embedding = geminiService.getEmbedding(request.content());
            memoryService.saveMemory(request.userId(), request.content(), request.emotion(), "user", embedding);
            return ResponseEntity.ok("Memory created successfully.");
        } catch (Exception e) {
            log.error("Failed to create memory: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Error creating memory: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> updateMemory(@PathVariable Long id, @RequestBody MemoryRequest request) {
        try {
            memoryService.updateMemory(id, request.userId(), request.content(), request.emotion());
            return ResponseEntity.ok("Memory updated successfully.");
        } catch (Exception e) {
            log.error("Failed to update memory {}: {}", id, e.getMessage());
            return ResponseEntity.internalServerError().body("Error updating memory: " + e.getMessage());
        }
    }

    public record MemoryRequest(String userId, String content, String emotion) {}
}
