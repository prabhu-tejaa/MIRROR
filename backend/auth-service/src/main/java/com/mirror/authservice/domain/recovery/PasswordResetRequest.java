package com.mirror.authservice.domain.recovery;

public record PasswordResetRequest(String email, String password) {}
