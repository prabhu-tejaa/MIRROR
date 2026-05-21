package com.mirror.memoryservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles; // Add this import

@SpringBootTest
@ActiveProfiles("test")
class MemoryServiceApplicationTests {

    @Test
    void contextLoads() {
    }

}