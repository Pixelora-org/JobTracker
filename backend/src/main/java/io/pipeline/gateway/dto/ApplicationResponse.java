package io.pipeline.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response DTO for Application.
 * Field names match the frontend's camelCase convention.
 */
public record ApplicationResponse(
    UUID id,
    @JsonProperty("userId") String userId,
    String company,
    String role,
    @JsonProperty("jobUrl") String jobUrl,
    String track,
    @JsonProperty("resumeVersion") String resumeVersion,
    String status,
    String source,
    String location,
    @JsonProperty("workMode") String workMode,
    @JsonProperty("dateApplied") OffsetDateTime dateApplied,
    @JsonProperty("nextActionDate") OffsetDateTime nextActionDate,
    String notes,
    @JsonProperty("createdAt") OffsetDateTime createdAt,
    @JsonProperty("updatedAt") OffsetDateTime updatedAt
) {}
