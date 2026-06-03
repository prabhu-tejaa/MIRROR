package com.mirror.authservice.domain.auth;
import com.mirror.authservice.domain.user.User;

import com.mirror.authservice.domain.auth.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByToken(String token);

    void deleteByToken(String token);

    void deleteByUser(com.mirror.authservice.domain.user.User user);
}