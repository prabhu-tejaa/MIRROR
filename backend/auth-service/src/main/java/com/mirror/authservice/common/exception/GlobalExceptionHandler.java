package com.mirror.authservice.common.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllExceptions(Exception ex) {
        log.error("Unhandled exception caught in GlobalExceptionHandler: ", ex);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Internal Server Error");
        errorResponse.put("message", ex.getMessage() != null ? ex.getMessage() : "An unexpected error occurred");
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.put("errorCode", determineErrorCode(ex));
        
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument exception: {}", ex.getMessage());
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("status", HttpStatus.BAD_REQUEST.value());
        errorResponse.put("errorCode", determineErrorCode(ex));
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(LoginFailureException.class)
    public ResponseEntity<Map<String, Object>> handleLoginFailureException(LoginFailureException ex) {
        log.warn("Login failure: {}", ex.getMessage());
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Unauthorized");
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("status", HttpStatus.UNAUTHORIZED.value());
        errorResponse.put("errorCode", determineErrorCode(ex));
        
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler({UserNotFoundException.class, InvalidOtpException.class})
    public ResponseEntity<Map<String, Object>> handleCustomExceptions(RuntimeException ex) {
        log.warn("Custom exception: {}", ex.getMessage());
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("status", HttpStatus.BAD_REQUEST.value());
        errorResponse.put("errorCode", determineErrorCode(ex));
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    private String determineErrorCode(Exception ex) {
        if (ex instanceof UserNotFoundException) return "USER_NOT_FOUND";
        if (ex instanceof InvalidOtpException) return "INVALID_OR_EXPIRED_OTP";
        if (ex instanceof LoginFailureException) {
            if (ex.getMessage() != null && ex.getMessage().contains("locked")) return "ACCOUNT_LOCKED";
            return "INVALID_CREDENTIALS";
        }
        if (ex.getMessage() != null) {
            String msg = ex.getMessage().toLowerCase();
            if (msg.contains("email is already registered")) return "EMAIL_ALREADY_REGISTERED";
            if (msg.contains("username is already taken")) return "USERNAME_ALREADY_TAKEN";
            if (msg.contains("refresh token has expired")) return "REFRESH_TOKEN_EXPIRED";
            if (msg.contains("invalid refresh token")) return "INVALID_REFRESH_TOKEN";
            if (msg.contains("no account found")) return "USER_NOT_FOUND";
        }
        return "INTERNAL_SERVER_ERROR";
    }
}
