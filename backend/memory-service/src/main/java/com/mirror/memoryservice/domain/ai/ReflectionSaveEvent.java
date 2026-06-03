package com.mirror.memoryservice.domain.ai;

public record ReflectionSaveEvent(
        String userId,
        String prompt,
        String reflection,
        String emotion
) {
}
