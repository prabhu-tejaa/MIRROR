package com.mirror.memoryservice.memory.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "memories", indexes = {
    @Index(name = "idx_memory_user_id", columnList = "user_id"),
    @Index(name = "idx_memory_user_id_id_desc", columnList = "user_id, id DESC")
})
public class Memory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false, length = 255)
    private String emotion;

    @Column(nullable = false, length = 50)
    private String sender = "user";

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "embedding", columnDefinition = "vector(768)")
    private String embedding;

    @Transient
    private String originalEmotionName;

    private Instant createdAt = Instant.now();

    public Memory() {}

    public Memory(Long id, String userId, String content, String emotion, String sender, String embedding, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.content = content;
        this.emotion = emotion;
        this.sender = sender;
        this.embedding = embedding;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getEmotion() { return emotion; }
    public void setEmotion(String emotion) { this.emotion = emotion; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getEmbedding() { return embedding; }
    public void setEmbedding(String embedding) { this.embedding = embedding; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getOriginalEmotionName() { return originalEmotionName; }
    public void setOriginalEmotionName(String originalEmotionName) { this.originalEmotionName = originalEmotionName; }
}