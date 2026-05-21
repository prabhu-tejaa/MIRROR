package com.mirror.authservice.repository;

import com.mirror.authservice.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    // Custom query to find a session token string in the DB
    Optional<RefreshToken> findByToken(String token);

    // Custom query to delete a token when a user logs out
    void deleteByToken(String token);
}