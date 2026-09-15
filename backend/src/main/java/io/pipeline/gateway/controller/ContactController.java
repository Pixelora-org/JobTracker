package io.pipeline.gateway.controller;

import io.pipeline.core.service.ContactService;
import io.pipeline.gateway.dto.ContactCreateRequest;
import io.pipeline.gateway.dto.ContactResponse;
import io.pipeline.gateway.dto.ContactUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Contacts API.
 * Manages contacts (people the user has reached out to or wants to contact).
 */
@RestController
@RequestMapping("/api/v1/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    /**
     * List all contacts for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<ContactResponse>> listContacts(Authentication authentication) {
        String userId = extractUserId(authentication);
        List<ContactResponse> contacts = contactService.listContacts(userId);
        return ResponseEntity.ok(contacts);
    }

    /**
     * Get a single contact by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ContactResponse> getContact(
            Authentication authentication,
            @PathVariable UUID id) {
        String userId = extractUserId(authentication);
        ContactResponse contact = contactService.getContact(userId, id);
        return ResponseEntity.ok(contact);
    }

    /**
     * Create a new contact.
     */
    @PostMapping
    public ResponseEntity<ContactResponse> createContact(
            Authentication authentication,
            @Valid @RequestBody ContactCreateRequest request) {
        String userId = extractUserId(authentication);
        ContactResponse created = contactService.createContact(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Find or create a contact by email.
     * If a contact with the email exists, return it; otherwise create a new one.
     */
    @PostMapping("/find-or-create")
    public ResponseEntity<ContactResponse> findOrCreateContact(
            Authentication authentication,
            @Valid @RequestBody ContactCreateRequest request) {
        String userId = extractUserId(authentication);
        ContactResponse contact = contactService.findOrCreateByEmail(userId, request);
        return ResponseEntity.ok(contact);
    }

    /**
     * Update an existing contact.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ContactResponse> updateContact(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody ContactUpdateRequest request) {
        String userId = extractUserId(authentication);
        ContactResponse updated = contactService.updateContact(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete a contact.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContact(
            Authentication authentication,
            @PathVariable UUID id) {
        String userId = extractUserId(authentication);
        contactService.deleteContact(userId, id);
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
}
