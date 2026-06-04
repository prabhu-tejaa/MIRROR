package com.mirror.memoryservice.ai.event;

public record ReflectionSaveEvent(
        String userId,
        String prompt,
        String reflection,
        String emotion
) {
}
