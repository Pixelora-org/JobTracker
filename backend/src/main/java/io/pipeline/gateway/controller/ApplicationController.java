package io.pipeline.gateway.controller;

import io.pipeline.core.service.ApplicationService;
import io.pipeline.gateway.dto.ApplicationCreateRequest;
import io.pipeline.gateway.dto.ApplicationResponse;
import io.pipeline.gateway.dto.ApplicationUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Applications API.
 * Routes requests from gateway layer to core service.
 */
@RestController
@RequestMapping("/api/v1/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    /**
     * List all applications for the authenticated user.
     * Optional query param: status
     */
    @GetMapping
    public ResponseEntity<List<ApplicationResponse>> listApplications(
            Authentication authentication,
            @RequestParam(required = false) String status) {
        String userId = extractUserId(authentication);
        List<ApplicationResponse> applications = applicationService.listApplications(userId, status);
        return ResponseEntity.ok(applications);
    }

    /**
     * Get a single application by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getApplication(
            Authentication authentication,
            @PathVariable UUID id) {
        String userId = extractUserId(authentication);
        ApplicationResponse application = applicationService.getApplication(userId, id);
        return ResponseEntity.ok(application);
    }

    /**
     * Create a new application.
     */
    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            Authentication authentication,
            @Valid @RequestBody ApplicationCreateRequest request) {
        String userId = extractUserId(authentication);
        ApplicationResponse created = applicationService.createApplication(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update an existing application.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApplicationResponse> updateApplication(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody ApplicationUpdateRequest request) {
        String userId = extractUserId(authentication);
        ApplicationResponse updated = applicationService.updateApplication(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete an application.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(
            Authentication authentication,
            @PathVariable UUID id) {
        String userId = extractUserId(authentication);
        applicationService.deleteApplication(userId, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Extract the Clerk user ID (sub claim) from the JWT token.
     */
    private String extractUserId(Authentication authentication) {
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaimAsString("sub");
        }
        throw new IllegalStateException("Unable to extract user ID from authentication");
    }

    /**
     * Exception handler for application not found.
     */
    @ExceptionHandler(ApplicationService.ApplicationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ApplicationService.ApplicationNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    /**
     * Generic exception handler.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }

    private record ErrorResponse(String code, String message) {}
}
