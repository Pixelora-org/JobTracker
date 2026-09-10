package io.pipeline;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Basic smoke test to verify the application class exists and is well-formed.
 * No Spring context needed - this runs as a plain JUnit test.
 */
class PipelineApplicationTests {

    @Test
    void applicationClassExists() {
        // Verify the main application class exists and has a main method
        assertNotNull(PipelineApplication.class);
        try {
            PipelineApplication.class.getMethod("main", String[].class);
        } catch (NoSuchMethodException e) {
            throw new AssertionError("PipelineApplication.main method not found", e);
        }
    }
}
