package com.mirror.authservice.domain.auth;

public record RegisterRequest(String username, String email, String password) {}