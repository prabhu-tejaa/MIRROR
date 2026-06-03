package com.mirror.authservice.common.exception;

public class LoginFailureException extends RuntimeException {
    public LoginFailureException(String message) {
        super(message);
    }
}
