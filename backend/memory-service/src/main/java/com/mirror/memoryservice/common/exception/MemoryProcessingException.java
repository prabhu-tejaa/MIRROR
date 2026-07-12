package com.mirror.memoryservice.common.exception;

public class MemoryProcessingException extends RuntimeException {
    public MemoryProcessingException(String message) {
        super(message);
    }

    public MemoryProcessingException(String message, Throwable cause) {
        super(message, cause);
    }
}
