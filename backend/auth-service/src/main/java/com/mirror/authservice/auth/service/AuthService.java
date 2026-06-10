package com.mirror.authservice.auth.service;
import com.mirror.authservice.user.dto.UserResponse;
import com.mirror.authservice.user.dto.UserUpdateRequest;
import com.mirror.authservice.recovery.service.OtpService;
import com.mirror.authservice.config.email.EmailService;

import com.mirror.authservice.auth.dto.AuthResponse;
import com.mirror.authservice.auth.model.RefreshToken;
import com.mirror.authservice.user.model.Role;
import com.mirror.authservice.user.model.User;
import com.mirror.authservice.user.repository.UserRepository;
import com.mirror.authservice.auth.repository.RefreshTokenRepository;
import com.mirror.authservice.recovery.repository.OtpTokenRepository;
import com.mirror.authservice.common.exception.UserNotFoundException;
import com.mirror.authservice.common.exception.InvalidOtpException;
import com.mirror.authservice.config.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import com.mirror.authservice.common.exception.LoginFailureException;
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
    private final OtpService otpService;
    private final EmailService emailService;

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

    public com.mirror.authservice.user.dto.UserResponse adminCreateUser(String username, String email, String rawPassword, Role role) {
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

        if (user.getLockedUntil() != null) {
            if (user.getLockedUntil().isAfter(LocalDateTime.now())) {
                throw new LoginFailureException("Account is locked. Try again later.");
            } else {
                user.setLockedUntil(null);
                user.setFailedAttempts(0);
            }
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
                userRepository.save(user);
                throw new LoginFailureException("Account is locked due to too many failed attempts. Try again later.");
            }
            userRepository.save(user);
            throw new LoginFailureException("Invalid email or password!");
        }

        if (!user.isVerified()) {
            throw new LoginFailureException("Please verify your email address before logging in.");
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
    public void resetPassword(String email, String newRawPassword, String resetToken) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!jwtUtil.validateResetToken(resetToken, user)) {
            throw new RuntimeException("Invalid or expired password reset token.");
        }
        
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

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Account is locked.");
        }
        
        if (!user.isVerified()) {
            throw new RuntimeException("Account is not verified.");
        }

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

    public java.util.List<com.mirror.authservice.user.dto.UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToUserResponse).toList();
    }

    public com.mirror.authservice.user.dto.UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToUserResponse(user);
    }

    @Transactional
    public com.mirror.authservice.user.dto.UserResponse updateUser(UUID id, com.mirror.authservice.user.dto.UserUpdateRequest request) {
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
        if (request.getLockedUntil() != null) {
            user.setLockedUntil(request.getLockedUntil());
        }

        User updatedUser = userRepository.save(user);
        return mapToUserResponse(updatedUser);
    }

    @Transactional
    public void requestOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        String code = otpService.generateOtp(email);
        emailService.sendOtpEmail(email, code, user.getUsername(), "VERIFY");
    }

    @Transactional
    public AuthResponse verifyOtpAndIssueTokens(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        boolean isValid = otpService.verifyOtp(user, code);
        if (!isValid) {
            throw new InvalidOtpException("Invalid or expired OTP.");
        }
        user.setVerified(true);
        userRepository.save(user);
        return issueTokensForVerifiedUser(user);
    }

    @Transactional
    public void requestForgotPasswordOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("No account found with this email address."));
        String code = otpService.generateOtp(email);
        emailService.sendOtpEmail(email, code, user.getUsername(), "RESET");
    }

    @Transactional
    public String verifyForgotPasswordOtp(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        boolean isValid = otpService.verifyOtp(user, code);
        if (!isValid) {
            throw new InvalidOtpException("Invalid or expired OTP.");
        }
        return jwtUtil.generateResetToken(user);
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        refreshTokenRepository.deleteByUser(user);
        otpTokenRepository.deleteByUser(user);

        userRepository.delete(user);
    }

    private com.mirror.authservice.user.dto.UserResponse mapToUserResponse(User user) {
        return com.mirror.authservice.user.dto.UserResponse.builder()
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