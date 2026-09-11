package io.pipeline.core.service;

import io.pipeline.core.domain.Application;
import io.pipeline.core.repository.ApplicationRepository;
import io.pipeline.gateway.dto.ApplicationCreateRequest;
import io.pipeline.gateway.dto.ApplicationResponse;
import io.pipeline.gateway.dto.ApplicationUpdateRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for Application business logic.
 * Handles user scoping and delegates to repository.
 */
@Service
@Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    public ApplicationService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    /**
     * List all applications for the authenticated user.
     */
    public List<ApplicationResponse> listApplications(String userId, String status) {
        List<Application> applications;
        
        if (status != null && !status.isBlank()) {
            applications = applicationRepository.findByUserIdAndStatusOrderByUpdatedAtDesc(userId, status);
        } else {
            applications = applicationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        }

        return applications.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get a single application by ID for the authenticated user.
     */
    public ApplicationResponse getApplication(String userId, UUID id) {
        Application application = applicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));
        return toResponse(application);
    }

    /**
     * Create a new application.
     */
    public ApplicationResponse createApplication(String userId, ApplicationCreateRequest request) {
        Application application = new Application();
        application.setUserId(userId);
        updateApplicationFromRequest(application, request);

        Application saved = applicationRepository.save(application);
        return toResponse(saved);
    }

    /**
     * Update an existing application.
     */
    public ApplicationResponse updateApplication(String userId, UUID id, ApplicationUpdateRequest request) {
        Application application = applicationRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ApplicationNotFoundException(id));

        if (request.company() != null) application.setCompany(request.company());
        if (request.role() != null) application.setRole(request.role());
        if (request.jobUrl() != null) application.setJobUrl(request.jobUrl());
        if (request.track() != null) application.setTrack(request.track());
        if (request.resumeVersion() != null) application.setResumeVersion(request.resumeVersion());
        if (request.status() != null) application.setStatus(request.status());
        if (request.source() != null) application.setSource(request.source());
        if (request.location() != null) application.setLocation(request.location());
        if (request.workMode() != null) application.setWorkMode(request.workMode());
        if (request.dateApplied() != null) application.setDateApplied(request.dateApplied());
        if (request.nextActionDate() != null) application.setNextActionDate(request.nextActionDate());
        if (request.notes() != null) application.setNotes(request.notes());

        Application updated = applicationRepository.save(application);
        return toResponse(updated);
    }

    /**
     * Delete an application.
     */
    public void deleteApplication(String userId, UUID id) {
        if (!applicationRepository.findByIdAndUserId(id, userId).isPresent()) {
            throw new ApplicationNotFoundException(id);
        }
        applicationRepository.deleteByIdAndUserId(id, userId);
    }

    private void updateApplicationFromRequest(Application application, ApplicationCreateRequest request) {
        application.setCompany(request.company().trim());
        application.setRole(request.role().trim());
        application.setJobUrl(request.jobUrl());
        application.setTrack(request.track());
        application.setResumeVersion(request.resumeVersion());
        application.setStatus(request.status());
        application.setSource(request.source());
        application.setLocation(request.location());
        application.setWorkMode(request.workMode());
        application.setDateApplied(request.dateApplied());
        application.setNextActionDate(request.nextActionDate());
        application.setNotes(request.notes());
    }

    private ApplicationResponse toResponse(Application application) {
        return new ApplicationResponse(
            application.getId(),
            application.getUserId(),
            application.getCompany(),
            application.getRole(),
            application.getJobUrl(),
            application.getTrack(),
            application.getResumeVersion(),
            application.getStatus(),
            application.getSource(),
            application.getLocation(),
            application.getWorkMode(),
            application.getDateApplied(),
            application.getNextActionDate(),
            application.getNotes(),
            application.getCreatedAt(),
            application.getUpdatedAt()
        );
    }

    public static class ApplicationNotFoundException extends RuntimeException {
        public ApplicationNotFoundException(UUID id) {
            super("Application not found: " + id);
        }
    }
}
