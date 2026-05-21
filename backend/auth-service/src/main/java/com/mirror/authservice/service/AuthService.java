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
        // 1. Validation Rule: Check if the email or username is already taken
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered!");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username is already taken!");
        }

        // 2. Security Rule: Hash the raw plain-text password safely
        String encryptedPassword = passwordEncoder.encode(rawPassword);

        // 3. Create the new User object using the Builder pattern
        User newUser = User.builder()
                .username(username)
                .email(email)
                .passwordHash(encryptedPassword)
                .role(Role.ROLE_USER)
                .build();

        // 4. Save the user to Neon Tech via the repository and return it
        return userRepository.save(newUser);
    }

    public User loginUser(String email, String rawPassword) {
        // 1. Find the user by email. If not found, throw an error.
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password!"));

        // 2. Security Check: Is the account currently locked?
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Account is locked. Try again later.");
        }

        // 3. Verify the password matches the hashed version in the DB
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            // Wrong password: Track the failure and lock if necessary
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= 5) {
                user.setLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepository.save(user);
            throw new RuntimeException("Invalid email or password!");
        }

        // 4. Success: Reset failed attempts tracker on successful login
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        return userRepository.save(user);
    }
}