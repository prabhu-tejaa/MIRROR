package com.mirror.authservice.domain.recovery;

import com.mirror.authservice.domain.recovery.OtpToken;
import com.mirror.authservice.domain.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {
    Optional<OtpToken> findTopByUserAndUsedFalseOrderByExpiresAtDesc(User user);
    void deleteByUser(User user);
}