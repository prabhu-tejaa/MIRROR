package com.mirror.memoryservice.service;

import com.mirror.memoryservice.Memory;
import com.mirror.memoryservice.MemoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MemoryServiceImpl implements MemoryService {

    private final MemoryRepository repository;

    public MemoryServiceImpl(MemoryRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public String saveMemory(String content) {
        Memory m = new Memory();
        m.setContent(content);
        repository.save(m);
        return "Memory saved to Postgres!";
    }

    @Override
    @Transactional(readOnly = true)
    public List<Memory> getAllMemories() {
        return repository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public long getMemoryCount() {
        return repository.count();
    }
}
