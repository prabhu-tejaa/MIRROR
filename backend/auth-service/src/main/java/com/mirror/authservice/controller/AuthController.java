package com.mirror.authservice.controller;

import com.mirror.authservice.dto.AuthResponse;
import com.mirror.authservice.dto.LoginRequest;
import com.mirror.authservice.dto.RegisterRequest;
import com.mirror.authservice.model.User;
import com.mirror.authservice.security.JwtUtil;
import com.mirror.authservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

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
}