package com.mirror.memoryservice;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "memories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Memory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String content;
}