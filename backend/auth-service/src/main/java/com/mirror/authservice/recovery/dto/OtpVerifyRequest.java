package com.mirror.authservice.recovery.dto;

public record OtpVerifyRequest(String email, String code) {}
