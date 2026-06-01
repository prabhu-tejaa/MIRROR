package com.mirror.memoryservice.service;

import com.mirror.memoryservice.Memory;
import java.util.List;
import java.util.Map;

public interface MemoryService {

    /**
     * Saves a memory with its corresponding semantic vector embedding.
     */
    String saveMemory(String userId, String content, String emotion, String sender, float[] embedding);

    /**
     * Performs a semantic RAG similarity lookup on past memories.
     */
    List<Memory> getSimilarMemories(String userId, String prompt, int limit);

    /**
     * Computes grouped emotional percentage statistics for the user dashboard.
     */
    Map<String, Long> getEmotionalAnalytics(String userId);

    /**
     * Generates a context-aware empathetic AI reflection by combining past similar memories.
     */
    Map<String, String> generateReflection(String userId, String prompt);

    /**
     * Retrieves all memories for a user.
     */
    List<Memory> getAllMemories(String userId);

    /**
     * Retrieves a paginated slice of memories for a user (newest first).
     * Returns a map with keys: "messages" (List), "total" (Long), "hasMore" (Boolean).
     */
    Map<String, Object> getMemoriesPaginated(String userId, int page, int size);

    /**
     * Retrieves the total memory count for a user.
     */
    long getMemoryCount(String userId);

    /**
     * Deletes a memory by ID (Admin).
     */
    void deleteMemory(Long id);

    /**
     * Updates an existing memory record.
     */
    void updateMemory(Long id, String userId, String content, String emotion);

    /**
     * Retrieves all memories in the system (Admin).
     */
    List<Memory> getAllMemoriesAdmin();
}
