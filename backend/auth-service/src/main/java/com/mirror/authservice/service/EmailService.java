package com.mirror.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    public void sendOtpEmail(String to, String otp, String username) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Your Mirror Verification Code");

        String body = "Hi " + username + " ✧‿✧･ﾟ\n\n" +
                "Your OTP code is: " + otp + "\n" +
                "This code expires in 5 minutes.\n\n" +
                "Thank you for choosing Mirror! >^‿^<\n\n" +
                "Best regards,\n" +
                "The Mirror Team";

        message.setText(body);
        mailSender.send(message);
    }
}