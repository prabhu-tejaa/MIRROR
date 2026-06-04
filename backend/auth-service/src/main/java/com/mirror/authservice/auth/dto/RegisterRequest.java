package com.mirror.authservice.auth.dto;

public record RegisterRequest(String username, String email, String password) {}