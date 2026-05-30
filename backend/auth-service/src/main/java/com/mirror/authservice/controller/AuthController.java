package com.mirror.authservice.controller;

import com.mirror.authservice.dto.*;
import com.mirror.authservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        var registeredUser = authService.registerUser(
                request.username(),
                request.email(),
                request.password()
        );
        return ResponseEntity.ok("User registered successfully with ID: " + registeredUser.getId());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.loginUserAndIssueTokens(request.email(), request.password());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/request")
    public ResponseEntity<String> requestOtp(@RequestBody OtpRequest request) {
        authService.requestOtp(request.email());
        return ResponseEntity.ok("OTP sent to your email.");
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody OtpVerifyRequest request) {
        AuthResponse response = authService.verifyOtpAndIssueTokens(request.email(), request.code());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<String> requestForgotPasswordOtp(@RequestBody ForgotPasswordRequest request) {
        authService.requestForgotPasswordOtp(request.email());
        return ResponseEntity.ok("Password reset OTP sent to your email.");
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<String> verifyForgotPasswordOtp(@RequestBody OtpVerifyRequest request) {
        authService.verifyForgotPasswordOtp(request.email(), request.code());
        return ResponseEntity.ok("OTP verified successfully. You may now reset your password.");
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<String> resetPassword(@RequestBody PasswordResetRequest request) {
        if (request.password() == null || request.password().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Password cannot be empty.");
        }
        authService.resetPassword(request.email(), request.password());
        return ResponseEntity.ok("Password reset successfully. Please proceed to login.");
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody TokenRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isEmpty()) {
            return ResponseEntity.badRequest().body("Refresh token missing.");
        }
        AuthResponse response = authService.refreshAccessToken(request.refreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestBody TokenRequest request) {
        if (request.refreshToken() != null && !request.refreshToken().isEmpty()) {
            authService.logout(request.refreshToken());
        }
        return ResponseEntity.ok("Logged out successfully.");
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateSession(@RequestBody TokenRequest request) {
        if (request.refreshToken() == null || request.refreshToken().isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Session token missing."));
        }
        boolean isValid = authService.isSessionValid(request.refreshToken());
        if (isValid) {
            return ResponseEntity.ok(Map.of("valid", true));
        }
        return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Session has been invalidated or logged out."));
    }

    @GetMapping("/keepalive")
    public ResponseEntity<?> keepAlive() {
        // Calling count via service layer to respect layered boundaries
        long count = authService.getAllUsers().size();
        return ResponseEntity.ok(Map.of(
            "status", "awake",
            "service", "auth-service",
            "db_status", "healthy",
            "user_count", count
        ));
    }
}