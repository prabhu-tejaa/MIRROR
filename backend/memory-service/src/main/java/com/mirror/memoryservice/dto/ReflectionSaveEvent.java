package com.mirror.memoryservice.dto;

public record ReflectionSaveEvent(
        String userId,
        String prompt,
        String reflection,
        String emotion
) {
}
