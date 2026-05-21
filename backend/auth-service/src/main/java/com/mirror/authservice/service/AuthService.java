package com.mirror.authservice.service;

import com.mirror.authservice.dto.AuthResponse;
import com.mirror.authservice.model.RefreshToken;
import com.mirror.authservice.model.Role;
import com.mirror.authservice.model.User;
import com.mirror.authservice.repository.UserRepository;
import com.mirror.authservice.repository.RefreshTokenRepository;
import com.mirror.authservice.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
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

    public User loginUser(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password!"));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Account is locked. Try again later.");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepository.save(user);
            throw new RuntimeException("Invalid email or password!");
        }

        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        return userRepository.save(user);
    }

    @Transactional
    public AuthResponse loginUserAndIssueTokens(String email, String rawPassword) {
        User user = loginUser(email, rawPassword);
        return generateSessionTokens(user);
    }

    @Transactional
    public AuthResponse issueTokensForVerifiedUser(User user) {
        return generateSessionTokens(user);
    }

    private AuthResponse generateSessionTokens(User user) {
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
                .build();
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.deleteByToken(refreshTokenStr);
    }
}