package com.mirror.memoryservice.common.exception;
import com.mirror.memoryservice.domain.memory.Memory;

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
        errorResponse.put("errorCode", "BAD_REQUEST");
        
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MemoryProcessingException.class)
    public ResponseEntity<Map<String, Object>> handleMemoryProcessingException(MemoryProcessingException ex) {
        log.error("Memory processing error: ", ex);
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Internal Server Error");
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.put("errorCode", "MEMORY_PROCESSING_ERROR");
        
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private String determineErrorCode(Exception ex) {
        if (ex.getMessage() != null) {
            String msg = ex.getMessage().toLowerCase();
            if (msg.contains("gemini")) return "AI_SERVICE_ERROR";
            if (msg.contains("database")) return "DATABASE_ERROR";
            if (msg.contains("jwt")) return "UNAUTHORIZED";
        }
        return "INTERNAL_SERVER_ERROR";
    }
}
