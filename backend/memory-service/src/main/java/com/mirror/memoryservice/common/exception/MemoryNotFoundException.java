package com.mirror.memoryservice.common.exception;

public class MemoryNotFoundException extends RuntimeException {
    public MemoryNotFoundException(String message) {
        super(message);
    }
}
