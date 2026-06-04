package com.mirror.authservice.recovery.repository;

import com.mirror.authservice.recovery.model.OtpToken;
import com.mirror.authservice.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {
    Optional<OtpToken> findTopByUserAndUsedFalseOrderByExpiresAtDesc(User user);
    void deleteByUser(User user);
}