package io.pipeline.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for creating a Contact.
 */
public record ContactCreateRequest(
    @NotBlank(message = "Name is required")
    String name,

    String email,

    @JsonProperty("linkedinUrl")
    String linkedinUrl,

    @NotBlank(message = "Company is required")
    String company,

    String title
) {}
