package com.mirror.authservice.controller;

import com.mirror.authservice.dto.AuthResponse;
import com.mirror.authservice.dto.LoginRequest;
import com.mirror.authservice.dto.RegisterRequest;
import com.mirror.authservice.model.User;
import com.mirror.authservice.repository.UserRepository;
import com.mirror.authservice.security.JwtUtil;
import com.mirror.authservice.service.AuthService;
import com.mirror.authservice.service.EmailService;
import com.mirror.authservice.service.OtpService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @PostMapping("/signup")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User registeredUser = authService.registerUser(
                    request.username(),
                    request.email(),
                    request.password()
            );
            return ResponseEntity.ok("User registered successfully with ID: " + registeredUser.getId());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.loginUserAndIssueTokens(request.email(), request.password());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @PostMapping("/otp/request")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String code = otpService.generateOtp(email);

        emailService.sendOtpEmail(email, code, user.getUsername(), "VERIFY");

        return ResponseEntity.ok("OTP sent to your email.");
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String code = request.get("code");

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isValid = otpService.verifyOtp(user, code);

            if (isValid) {
                user.setVerified(true);
                userRepository.save(user);

                AuthResponse response = authService.issueTokensForVerifiedUser(user);
                return ResponseEntity.ok(response);
            }

            return ResponseEntity.status(401).body("Invalid or expired OTP.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<?> requestForgotPasswordOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("No account found with this email address."));

            String code = otpService.generateOtp(email);

            emailService.sendOtpEmail(email, code, user.getUsername(), "RESET");

            return ResponseEntity.ok("Password reset OTP sent to your email.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<?> verifyForgotPasswordOtp(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String code = request.get("code");

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isValid = otpService.verifyOtp(user, code);

            if (isValid) {
                return ResponseEntity.ok("OTP verified successfully. You may now reset your password.");
            }

            return ResponseEntity.status(401).body("Invalid or expired OTP.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String newPassword = request.get("password");

            if (newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Password cannot be empty.");
            }

            authService.resetPassword(email, newPassword);

            return ResponseEntity.ok("Password reset successfully. Please proceed to login.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken == null || refreshToken.isEmpty()) {
                return ResponseEntity.badRequest().body("Refresh token missing.");
            }

            AuthResponse response = authService.refreshAccessToken(refreshToken);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.get("refreshToken");
            if (refreshToken != null && !refreshToken.isEmpty()) {
                authService.logout(refreshToken);
            }
            return ResponseEntity.ok("Logged out successfully.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}