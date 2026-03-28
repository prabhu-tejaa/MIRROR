package com.mirror.memoryservice;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {

    private final MemoryRepository repository;

    public MemoryController(MemoryRepository repository) {
        this.repository = repository;
    }

    @PostMapping("/save")
    public String saveRandom(@RequestBody String text) {
        Memory m = new Memory();
        m.setContent(text);
        repository.save(m);
        return "Memory saved to Postgres!";
    }

    @GetMapping("/all")
    public List<Memory> getAll() {
        return repository.findAll();
    }
}