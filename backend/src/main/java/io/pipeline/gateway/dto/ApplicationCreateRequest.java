package io.pipeline.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

/**
 * Request DTO for creating an Application.
 */
public record ApplicationCreateRequest(
    @NotBlank(message = "Company is required")
    String company,

    @NotBlank(message = "Role is required")
    String role,

    @JsonProperty("jobUrl")
    String jobUrl,

    @NotBlank(message = "Track is required")
    String track,

    @JsonProperty("resumeVersion")
    String resumeVersion,

    @NotBlank(message = "Status is required")
    String status,

    @NotBlank(message = "Source is required")
    String source,

    String location,

    @JsonProperty("workMode")
    String workMode,

    @JsonProperty("dateApplied")
    OffsetDateTime dateApplied,

    @JsonProperty("nextActionDate")
    OffsetDateTime nextActionDate,

    String notes
) {}
