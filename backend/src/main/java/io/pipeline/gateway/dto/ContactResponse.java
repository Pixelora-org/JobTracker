package io.pipeline.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for Contact.
 * Field names match the frontend's camelCase convention.
 */
public record ContactResponse(
    UUID id,
    @JsonProperty("userId") String userId,
    String name,
    String email,
    @JsonProperty("linkedinUrl") String linkedinUrl,
    String company,
    String title,
    @JsonProperty("createdAt") OffsetDateTime createdAt,
    @JsonProperty("updatedAt") OffsetDateTime updatedAt
) {}
