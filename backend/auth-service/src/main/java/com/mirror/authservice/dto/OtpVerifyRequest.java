package com.mirror.authservice.dto;

public record OtpVerifyRequest(String email, String code) {}
