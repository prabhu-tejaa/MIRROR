package com.mirror.authservice.dto;

public record AuthResponse(String accessToken, String refreshToken, String username) {}