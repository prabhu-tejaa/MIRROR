package com.mirror.authservice.repository;

import com.mirror.authservice.model.OtpToken;
import com.mirror.authservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {
    Optional<OtpToken> findTopByUserAndUsedFalseOrderByExpiresAtDesc(User user);
    void deleteByUser(User user);
}