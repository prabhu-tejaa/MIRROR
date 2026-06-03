package com.mirror.authservice.domain.recovery;

public record OtpVerifyRequest(String email, String code) {}
