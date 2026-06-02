package com.mirror.memoryservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "memories")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor
public class Memory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false, length = 50)
    private String emotion;

    @Column(nullable = false, length = 50)
    private String sender = "user";

    @Column(name = "embedding", columnDefinition = "vector(768)")
    private String embedding;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}