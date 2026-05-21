package com.mirror.authservice.repository;

import com.mirror.authservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Custom query to find a user by their email (used during login)
    Optional<User> findByEmail(String email);

    // Custom query to find a user by their username
    Optional<User> findByUsername(String username);

    // Fast checks to see if an account already exists (used during signup)
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}