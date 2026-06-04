package com.mirror.authservice.recovery.dto;

public record PasswordResetRequest(String email, String password) {}
