package com.mirror.authservice.service;

import com.mirror.authservice.dto.AuthResponse;
import com.mirror.authservice.model.RefreshToken;
import com.mirror.authservice.model.Role;
import com.mirror.authservice.model.User;
import com.mirror.authservice.repository.UserRepository;
import com.mirror.authservice.repository.RefreshTokenRepository;
import com.mirror.authservice.repository.OtpTokenRepository;
import com.mirror.authservice.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.mirror.authservice.exception.LoginFailureException;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public User registerUser(String username, String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered!");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username is already taken!");
        }

        String encryptedPassword = passwordEncoder.encode(rawPassword);

        User newUser = User.builder()
                .username(username)
                .email(email)
                .passwordHash(encryptedPassword)
                .role(Role.ROLE_USER)
                .build();

        return userRepository.save(newUser);
    }

    public com.mirror.authservice.dto.UserResponse adminCreateUser(String username, String email, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered!");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username is already taken!");
        }

        String encryptedPassword = passwordEncoder.encode(rawPassword);

        User newUser = User.builder()
                .username(username)
                .email(email)
                .passwordHash(encryptedPassword)
                .role(role != null ? role : Role.ROLE_USER)
                .isVerified(true)
                .build();

        User savedUser = userRepository.save(newUser);
        return mapToUserResponse(savedUser);
    }

    public User loginUser(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new LoginFailureException("Invalid email or password!"));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new LoginFailureException("Account is locked. Try again later.");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepository.save(user);
            throw new LoginFailureException("Invalid email or password!");
        }

        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        return userRepository.save(user);
    }

    @Transactional(noRollbackFor = LoginFailureException.class)
    public AuthResponse loginUserAndIssueTokens(String email, String rawPassword) {
        User user = loginUser(email, rawPassword);
        return generateSessionTokens(user);
    }

    @Transactional
    public AuthResponse issueTokensForVerifiedUser(User user) {
        return generateSessionTokens(user);
    }

    private AuthResponse generateSessionTokens(User user) {
        // Delete all previous refresh tokens to ensure only one active session exists
        refreshTokenRepository.deleteByUser(user);

        String accessToken = jwtUtil.generateAccessToken(user);
        String randomRefreshToken = UUID.randomUUID().toString();

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .token(randomRefreshToken)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(randomRefreshToken)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    @Transactional
    public void resetPassword(String email, String newRawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String encryptedPassword = passwordEncoder.encode(newRawPassword);
        user.setPasswordHash(encryptedPassword);

        user.setFailedAttempts(0);
        user.setLockedUntil(null);

        userRepository.save(user);
    }

    @Transactional
    public AuthResponse refreshAccessToken(String refreshTokenStr) {
        RefreshToken refreshTokenEntity = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token!"));

        if (refreshTokenEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshTokenEntity);
            throw new RuntimeException("Refresh token has expired! Please log in again.");
        }

        User user = refreshTokenEntity.getUser();
        String newAccessToken = jwtUtil.generateAccessToken(user);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshTokenStr)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.deleteByToken(refreshTokenStr);
    }

    @Transactional(readOnly = true)
    public boolean isSessionValid(String refreshTokenStr) {
        return refreshTokenRepository.findByToken(refreshTokenStr)
                .map(token -> token.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }


    public java.util.List<com.mirror.authservice.dto.UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToUserResponse).toList();
    }

    public com.mirror.authservice.dto.UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToUserResponse(user);
    }

    @Transactional
    public com.mirror.authservice.dto.UserResponse updateUser(UUID id, com.mirror.authservice.dto.UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getUsername() != null && !request.getUsername().isEmpty()) {
            user.setUsername(request.getUsername());
        }
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            user.setEmail(request.getEmail());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getIsVerified() != null) {
            user.setVerified(request.getIsVerified());
        }
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getFailedAttempts() != null) {
            user.setFailedAttempts(request.getFailedAttempts());
            if (request.getFailedAttempts() == 0) {
                user.setLockedUntil(null);
            }
        }

        User updatedUser = userRepository.save(user);
        return mapToUserResponse(updatedUser);
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Must delete refresh tokens & OTP tokens first — they have a FK to the user.
        // Failing to clear these children violates foreign key constraints and prevents deletion (500).
        refreshTokenRepository.deleteByUser(user);
        otpTokenRepository.deleteByUser(user);

        userRepository.delete(user);
    }

    private com.mirror.authservice.dto.UserResponse mapToUserResponse(User user) {
        return com.mirror.authservice.dto.UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .isVerified(user.isVerified())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .failedAttempts(user.getFailedAttempts())
                .lockedUntil(user.getLockedUntil())
                .build();
    }
}