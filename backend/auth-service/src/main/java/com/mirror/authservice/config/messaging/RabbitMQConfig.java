package com.mirror.authservice.config.messaging;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String USER_DELETE_QUEUE = "user.delete.queue";

    @Bean
    public Queue userDeleteQueue() {
        return new Queue(USER_DELETE_QUEUE, true);
    }
}
