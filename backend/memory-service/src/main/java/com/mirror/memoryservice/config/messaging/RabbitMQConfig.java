package com.mirror.memoryservice.config.messaging;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String MEMORY_SAVE_QUEUE = "memory.save.queue";

    public static final String REFLECTION_SAVE_QUEUE = "reflection.save.queue";

    @Bean
    public Queue memorySaveQueue() {
        return new Queue(MEMORY_SAVE_QUEUE, true);
    }

    @Bean
    public Queue reflectionSaveQueue() {
        return new Queue(REFLECTION_SAVE_QUEUE, true);
    }
}
