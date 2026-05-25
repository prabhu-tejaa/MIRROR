package com.mirror.authservice.dto;

import com.mirror.authservice.model.Role;

public record AdminCreateUserRequest(
        String username,
        String email,
        String password,
        Role role
) {}
