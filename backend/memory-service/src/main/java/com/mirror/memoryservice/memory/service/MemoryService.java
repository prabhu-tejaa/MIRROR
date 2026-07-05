package com.mirror.memoryservice.memory.service;
import com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO;

import com.mirror.memoryservice.memory.model.Memory;
import java.util.List;
import java.util.Map;

public interface MemoryService {

    String saveMemory(String userId, String content, String emotion, String sender, float[] embedding);

    List<Memory> getSimilarMemories(String userId, String prompt, int limit);

    com.mirror.memoryservice.admin.dto.AnalyticsResponseDTO getEmotionalAnalytics(String userId);

    Map<String, String> getEmotionMapping(String userId);

    Map<String, String> generateReflection(String userId, String prompt);

    List<Memory> getAllMemories(String userId);

    Map<String, Object> getMemoriesPaginated(String userId, Long cursor, int size);

    long getMemoryCount(String userId);

    void deleteMemory(Long id);

    void updateMemory(Long id, String userId, String content, String emotion);

    List<Memory> getAllMemoriesAdmin();

    void deleteAllMemoriesForUser(String userId);
}
