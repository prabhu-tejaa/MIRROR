package com.mirror.memoryservice;

import com.mirror.memoryservice.service.MemoryService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {

    private final MemoryService service;

    public MemoryController(MemoryService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public String saveRandom(@RequestBody String text) {
        return service.saveMemory(text);
    }

    @GetMapping("/all")
    public List<Memory> getAll() {
        return service.getAllMemories();
    }

    @GetMapping("/keepalive")
    public String keepAlive() {
        try {
            long count = service.getMemoryCount();
            return "Memory service is awake. Active records: " + count;
        } catch (Exception e) {
            return "Memory service database error: " + e.getMessage();
        }
    }
}