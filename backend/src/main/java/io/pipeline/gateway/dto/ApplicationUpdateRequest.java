package io.pipeline.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

/**
 * Request DTO for updating an Application.
 * All fields are optional for partial updates.
 */
public record ApplicationUpdateRequest(
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
    String notes
) {}
