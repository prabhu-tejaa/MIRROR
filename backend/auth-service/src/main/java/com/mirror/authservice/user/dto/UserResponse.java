package com.mirror.authservice.user.dto;
import com.mirror.authservice.user.model.Role;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    private Role role;
    
    @JsonProperty("isVerified")
    private boolean isVerified;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int failedAttempts;
    private LocalDateTime lockedUntil;
}
