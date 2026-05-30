package com.mirror.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Async
    public void sendOtpEmail(String to, String otp, String username, String type) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);

        String subject;
        String body;

        if ("RESET".equalsIgnoreCase(type)) {
            subject = "Reset Your Mirror Password";
            body = "Hi " + username + ",\n\n" +
                    "We received a request to reset your password. Use the verification code below to proceed:\n\n" +
                    "Your Reset Code is: " + otp + "\n" +
                    "This code will expire in 5 minutes.\n\n" +
                    "If you did not request this, please ignore this email.\n\n" +
                    "Best regards,\n" +
                    "The Mirror Security Team";
        } else {
            subject = "Your Mirror Verification Code";
            body = "Hi " + username + " ✧‿✧･ﾟ\n\n" +
                    "Your OTP code is: " + otp + "\n" +
                    "This code expires in 5 minutes.\n\n" +
                    "Thank you for choosing Mirror! >^‿^<\n\n" +
                    "Best regards,\n" +
                    "The Mirror Team";
        }

        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}