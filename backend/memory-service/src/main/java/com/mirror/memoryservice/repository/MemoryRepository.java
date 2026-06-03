package com.mirror.memoryservice.repository;

import com.mirror.memoryservice.model.Memory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface MemoryRepository extends JpaRepository<Memory, Long> {

    /**
     * Inserts a new memory with raw vector casting to ensure 100% database driver compatibility.
     */
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO memories (user_id, content, emotion, sender, embedding, created_at) " +
                   "VALUES (:userId, :content, :emotion, :sender, CASE WHEN :embedding IS NULL THEN NULL ELSE CAST(:embedding AS vector) END, CURRENT_TIMESTAMP)", nativeQuery = true)
    void saveMemoryWithEmbedding(
        @Param("userId") String userId, 
        @Param("content") String content, 
        @Param("emotion") String emotion, 
        @Param("sender") String sender,
        @Param("embedding") String embedding
    );

    /**
     * Semantic Cosine Similarity search on past memories context using pgvector's <=> operator.
     * Restricts queries strictly to the authenticated user's own thoughts (sender = 'user').
     */
    @Query(value = "SELECT id, user_id, content, emotion, sender, CAST(embedding AS text) AS embedding, created_at FROM memories " +
                   "WHERE user_id = :userId AND sender = 'user' " +
                   "ORDER BY embedding <=> CAST(:embedding AS vector) " +
                   "LIMIT :limit", nativeQuery = true)
    List<Memory> findSimilarMemories(
        @Param("userId") String userId, 
        @Param("embedding") String embedding, 
        @Param("limit") int limit
    );

    /**
     * Retrieve aggregate emotional classifications count for the user.
     */
    @Query(value = "SELECT emotion, COUNT(*) FROM memories " +
                   "WHERE user_id = :userId " +
                   "GROUP BY emotion", nativeQuery = true)
    List<Object[]> findEmotionCounts(@Param("userId") String userId);

    /**
     * Find all memories for a user ordered by timestamp and sequential sequence.
     */
    List<Memory> findAllByUserIdOrderByCreatedAtDescIdDesc(String userId);

    /**
     * Paginated fetch of memories for a user (newest first).
     * Uses native SQL with LIMIT/OFFSET for efficient cursor-free pagination.
     */
    @Query(value = "SELECT id, user_id, content, emotion, sender, CAST(embedding AS text) AS embedding, created_at FROM memories " +
                   "WHERE user_id = :userId " +
                   "ORDER BY created_at DESC, id DESC " +
                   "LIMIT :limit OFFSET :offset", nativeQuery = true)
    List<Memory> findMemoriesPaginated(
        @Param("userId") String userId,
        @Param("limit") int limit,
        @Param("offset") int offset
    );

    /**
     * Cursor-based (Keyset) pagination fetch of memories for a user (newest first).
     * Uses native SQL with a cursor (lastId) for deep pagination scalability.
     */
    @Query(value = "SELECT id, user_id, content, emotion, sender, CAST(embedding AS text) AS embedding, created_at FROM memories " +
                   "WHERE user_id = :userId AND (:cursor IS NULL OR id < CAST(CAST(:cursor AS TEXT) AS BIGINT)) " +
                   "ORDER BY id DESC " +
                   "LIMIT :limit", nativeQuery = true)
    List<Memory> findMemoriesKeysetPaginated(
        @Param("userId") String userId,
        @Param("limit") int limit,
        @Param("cursor") Long cursor
    );

    /**
     * Count memories for a user.
     */
    long countByUserId(String userId);
}