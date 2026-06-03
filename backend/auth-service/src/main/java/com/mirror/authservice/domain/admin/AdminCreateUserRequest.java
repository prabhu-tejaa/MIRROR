package com.mirror.authservice.domain.admin;
import com.mirror.authservice.domain.user.Role;


public record AdminCreateUserRequest(
        String username,
        String email,
        String password,
        Role role
) {}
