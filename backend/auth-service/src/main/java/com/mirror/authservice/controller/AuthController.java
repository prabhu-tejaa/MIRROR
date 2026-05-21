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
import org.springframework.web.bind.annotation.*;

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
            User user = authService.loginUser(request.email(), request.password());

            String accessToken = jwtUtil.generateAccessToken(user);
            String refreshToken = "mock-refresh-token-placeholder";

            return ResponseEntity.ok(new AuthResponse(accessToken, refreshToken, user.getUsername()));
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

        emailService.sendOtpEmail(email, code, user.getUsername());

        return ResponseEntity.ok("OTP sent to your email.");
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        User user = userRepository.findByEmail(request.get("email")).orElseThrow();
        boolean isValid = otpService.verifyOtp(user, request.get("code"));

        if (isValid) {
            user.setVerified(true);
            userRepository.save(user);
            return ResponseEntity.ok("OTP verified successfully.");
        }
        return ResponseEntity.status(401).body("Invalid or expired OTP.");
    }
}