package com.mirror.authservice.auth.controller;
import com.mirror.authservice.auth.dto.TokenRequest;
import com.mirror.authservice.auth.dto.AuthResponse;
import com.mirror.authservice.auth.dto.LoginRequest;
import com.mirror.authservice.auth.dto.RegisterRequest;
import com.mirror.authservice.auth.service.AuthService;
import com.mirror.authservice.recovery.dto.OtpRequest;
import com.mirror.authservice.recovery.dto.OtpVerifyRequest;
import com.mirror.authservice.recovery.dto.ForgotPasswordRequest;
import com.mirror.authservice.recovery.dto.PasswordResetRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    private ResponseCookie buildRefreshTokenCookie(String token, int maxAgeDays) {
        return ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(true) // Should be true for HTTPS (production)
                .path("/api/auth")
                .maxAge(Duration.ofDays(maxAgeDays))
                .sameSite("Strict")
                .build();
    }

    private ResponseCookie buildClearRefreshTokenCookie() {
        return ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/api/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }

    @PostMapping("/signup")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        var registeredUser = authService.registerUser(
                request.username(),
                request.email(),
                request.password()
        );
        return ResponseEntity.ok("User registered successfully with ID: " + registeredUser.getId());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        String safeEmail = request.email() != null ? request.email().trim().toLowerCase() : null;
        AuthResponse response = authService.loginUserAndIssueTokens(safeEmail, request.password());
        
        ResponseCookie cookie = buildRefreshTokenCookie(response.getRefreshToken(), 7);
        response.setRefreshToken(null); // Don't expose in JSON

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    @PostMapping("/otp/request")
    public ResponseEntity<String> requestOtp(@Valid @RequestBody OtpRequest request) {
        authService.requestOtp(request.email());
        return ResponseEntity.ok("OTP sent to your email.");
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        AuthResponse response = authService.verifyOtpAndIssueTokens(request.email(), request.code());
        
        ResponseCookie cookie = buildRefreshTokenCookie(response.getRefreshToken(), 7);
        response.setRefreshToken(null);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<String> requestForgotPasswordOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestForgotPasswordOtp(request.email());
        return ResponseEntity.ok("Password reset OTP sent to your email.");
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<String> verifyForgotPasswordOtp(@Valid @RequestBody OtpVerifyRequest request) {
        if (request.email() == null || request.email().trim().isEmpty() || request.code() == null || request.code().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email and code cannot be empty.");
        }
        String token = authService.verifyForgotPasswordOtp(request.email(), request.code());
        return ResponseEntity.ok(token);
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        if (request.email() == null || request.email().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email cannot be empty.");
        }
        if (request.password() == null || request.password().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Password cannot be empty.");
        }
        if (request.token() == null || request.token().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Reset token is missing.");
        }
        authService.resetPassword(request.email(), request.password(), request.token());
        return ResponseEntity.ok("Password reset successfully. Please proceed to login.");
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@CookieValue(name = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.status(401).body("Refresh token missing from cookie.");
        }
        AuthResponse response = authService.refreshAccessToken(refreshToken);
        
        // Also issue a new cookie just in case it rotates or to reset expiry
        ResponseCookie cookie = buildRefreshTokenCookie(response.getRefreshToken(), 7);
        response.setRefreshToken(null);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@CookieValue(name = "refreshToken", required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isEmpty()) {
            authService.logout(refreshToken);
        }
        ResponseCookie cookie = buildClearRefreshTokenCookie();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body("Logged out successfully.");
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateSession(@CookieValue(name = "refreshToken", required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Session cookie missing."));
        }
        boolean isValid = authService.isSessionValid(refreshToken);
        if (isValid) {
            return ResponseEntity.ok(Map.of("valid", true));
        }
        return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Session has been invalidated or logged out."));
    }

    @GetMapping("/keepalive")
    public ResponseEntity<?> keepAlive() {
        return ResponseEntity.ok(Map.of(
            "status", "awake",
            "service", "auth-service",
            "db_status", "healthy"
        ));
    }
}