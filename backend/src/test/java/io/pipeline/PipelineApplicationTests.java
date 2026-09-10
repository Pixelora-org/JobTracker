package io.pipeline;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Basic smoke test to verify the Spring Boot application context loads.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/testdb",
    "spring.datasource.username=test",
    "spring.datasource.password=test",
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.flyway.enabled=false",
    "clerk.jwks-uri=https://test.clerk.example.com/.well-known/jwks.json",
    "clerk.issuer=https://test.clerk.example.com"
})
class PipelineApplicationTests {

    @Test
    void contextLoads() {
        // This test verifies that the Spring Boot application context loads successfully
    }
}
