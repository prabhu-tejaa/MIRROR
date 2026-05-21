package com.mirror.authservice.service;

import com.mirror.authservice.model.Role;
import com.mirror.authservice.model.User; // Make sure this import is added
import com.mirror.authservice.repository.UserRepository;
import com.mirror.authservice.repository.RefreshTokenRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime; // Added for the login method

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

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
}