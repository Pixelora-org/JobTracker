package io.pipeline.gateway.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request DTO for updating a Contact.
 * All fields are optional.
 */
public record ContactUpdateRequest(
    String name,
    String email,
    @JsonProperty("linkedinUrl") String linkedinUrl,
    String company,
    String title
) {}
