package com.mirror.authservice.domain.recovery;

import com.mirror.authservice.common.exception.UserNotFoundException;
import com.mirror.authservice.domain.recovery.OtpToken;
import com.mirror.authservice.domain.user.User;
import com.mirror.authservice.domain.recovery.OtpTokenRepository;
import com.mirror.authservice.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class OtpService {
    private final OtpTokenRepository otpRepository;
    private final UserRepository userRepository;

    public String generateOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        String rawCode = String.format("%06d", new SecureRandom().nextInt(1000000));
        String hashedCode = DigestUtils.sha256Hex(rawCode);

        OtpToken otp = OtpToken.builder()
                .user(user)
                .hashedOtp(hashedCode)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();
        otpRepository.save(otp);
        return rawCode;
    }

    public boolean verifyOtp(User user, String rawCode) {
        return otpRepository.findTopByUserAndUsedFalseOrderByExpiresAtDesc(user)
                .filter(otp -> !otp.isExpired())
                .filter(otp -> DigestUtils.sha256Hex(rawCode).equals(otp.getHashedOtp()))
                .map(otp -> {
                    otp.setUsed(true);
                    otpRepository.save(otp);
                    return true;
                }).orElse(false);
    }
}