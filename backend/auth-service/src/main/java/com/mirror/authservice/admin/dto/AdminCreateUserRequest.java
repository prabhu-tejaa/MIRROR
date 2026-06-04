package com.mirror.authservice.admin.dto;
import com.mirror.authservice.user.model.Role;

public record AdminCreateUserRequest(
        String username,
        String email,
        String password,
        Role role
) {}
