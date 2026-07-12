package com.mirror.memoryservice;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@Disabled("Skipping context load test until test profile database configuration is completed")
@SpringBootTest
@ActiveProfiles("test")
class MemoryServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}