package com.mirror.authservice.dto;

public record PasswordResetRequest(String email, String password) {}
