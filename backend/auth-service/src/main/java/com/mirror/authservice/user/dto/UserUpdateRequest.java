package com.mirror.authservice.user.dto;
import com.mirror.authservice.user.model.Role;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UserUpdateRequest {
    private String username;
    private String email;
    private Role role;
    
    @JsonProperty("isVerified")
    private Boolean isVerified;
    
    private String password;
    private Integer failedAttempts;
}
