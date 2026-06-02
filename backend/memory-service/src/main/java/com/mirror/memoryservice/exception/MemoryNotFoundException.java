package com.mirror.memoryservice.exception;

public class MemoryNotFoundException extends RuntimeException {
    public MemoryNotFoundException(String message) {
        super(message);
    }
}
