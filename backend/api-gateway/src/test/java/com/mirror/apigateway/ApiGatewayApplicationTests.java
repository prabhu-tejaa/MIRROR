package com.mirror.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@org.springframework.test.context.TestPropertySource(properties = {
    "JWT_SECRET=dGhpcy1pcy1hLXZlcnktc2VjcmV0LWtleS1mb3Itand0LXRva2Vucy1tdXN0LWJlLWxvbmctZW5vdWdo",
    "SPRING_DATA_REDIS_HOST=localhost",
    "SPRING_DATA_REDIS_PORT=6379",
    "SPRING_DATA_REDIS_PASSWORD=dummy",
    "ZIPKIN_URL=http://localhost:9411"
})
class ApiGatewayApplicationTests {

    @Test
    void contextLoads() {
    }

}
