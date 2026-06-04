package com.mirror.authservice.recovery.model;
import com.mirror.authservice.user.model.User;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "otp_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OtpToken {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String hashedOtp;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private boolean used = false;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }
}