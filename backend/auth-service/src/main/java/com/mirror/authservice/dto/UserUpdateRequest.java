package com.mirror.authservice.dto;

import com.mirror.authservice.model.Role;
import lombok.Data;

@Data
public class UserUpdateRequest {
    private String username;
    private String email;
    private Role role;
    private Boolean isVerified;
    private String password;
    private Integer failedAttempts;
}
