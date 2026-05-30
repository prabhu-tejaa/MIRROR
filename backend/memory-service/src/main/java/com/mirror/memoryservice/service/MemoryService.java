package com.mirror.memoryservice.service;

import com.mirror.memoryservice.Memory;
import java.util.List;

public interface MemoryService {
    String saveMemory(String content);
    List<Memory> getAllMemories();
    long getMemoryCount();
}
