package com.mirror.memoryservice.domain.memory;
import com.mirror.memoryservice.domain.admin.AnalyticsResponseDTO;

import com.mirror.memoryservice.domain.memory.Memory;
import java.util.List;
import java.util.Map;

public interface MemoryService {

    String saveMemory(String userId, String content, String emotion, String sender, float[] embedding);

    List<Memory> getSimilarMemories(String userId, String prompt, int limit);

    com.mirror.memoryservice.domain.admin.AnalyticsResponseDTO getEmotionalAnalytics(String userId);

    Map<String, String> generateReflection(String userId, String prompt);

    List<Memory> getAllMemories(String userId);

    Map<String, Object> getMemoriesPaginated(String userId, Long cursor, int size);

    long getMemoryCount(String userId);

    void deleteMemory(Long id);

    void updateMemory(Long id, String userId, String content, String emotion);

    List<Memory> getAllMemoriesAdmin();
}
