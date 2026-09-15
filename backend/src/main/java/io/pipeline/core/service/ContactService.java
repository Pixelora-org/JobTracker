package io.pipeline.core.service;

import io.pipeline.core.domain.Contact;
import io.pipeline.core.repository.ContactRepository;
import io.pipeline.gateway.dto.ContactCreateRequest;
import io.pipeline.gateway.dto.ContactResponse;
import io.pipeline.gateway.dto.ContactUpdateRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for Contact business logic.
 * Handles user scoping and delegates to repository.
 */
@Service
@Transactional
public class ContactService {

    private final ContactRepository contactRepository;

    public ContactService(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    /**
     * List all contacts for the authenticated user.
     */
    public List<ContactResponse> listContacts(String userId) {
        List<Contact> contacts = contactRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return contacts.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Get a single contact by ID for the authenticated user.
     */
    public ContactResponse getContact(String userId, UUID id) {
        Contact contact = contactRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ContactNotFoundException(id));
        return toResponse(contact);
    }

    /**
     * Create a new contact.
     */
    public ContactResponse createContact(String userId, ContactCreateRequest request) {
        Contact contact = new Contact();
        contact.setUserId(userId);
        contact.setName(request.name().trim());
        contact.setEmail(request.email() != null ? request.email().trim() : null);
        contact.setLinkedinUrl(request.linkedinUrl() != null ? request.linkedinUrl().trim() : null);
        contact.setCompany(request.company().trim());
        contact.setTitle(request.title() != null ? request.title().trim() : null);

        Contact saved = contactRepository.save(contact);
        return toResponse(saved);
    }

    /**
     * Update an existing contact.
     */
    public ContactResponse updateContact(String userId, UUID id, ContactUpdateRequest request) {
        Contact contact = contactRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ContactNotFoundException(id));

        if (request.name() != null) contact.setName(request.name().trim());
        if (request.email() != null) contact.setEmail(request.email().trim());
        if (request.linkedinUrl() != null) contact.setLinkedinUrl(request.linkedinUrl().trim());
        if (request.company() != null) contact.setCompany(request.company().trim());
        if (request.title() != null) contact.setTitle(request.title().trim());

        Contact updated = contactRepository.save(contact);
        return toResponse(updated);
    }

    /**
     * Delete a contact.
     */
    public void deleteContact(String userId, UUID id) {
        if (!contactRepository.findByIdAndUserId(id, userId).isPresent()) {
            throw new ContactNotFoundException(id);
        }
        contactRepository.deleteByIdAndUserId(id, userId);
    }

    /**
     * Find or create a contact by email for the authenticated user.
     * If a contact with the email exists, return it; otherwise create a new one.
     */
    public ContactResponse findOrCreateByEmail(String userId, ContactCreateRequest request) {
        if (request.email() != null && !request.email().isBlank()) {
            return contactRepository.findByUserIdAndEmailIgnoreCase(userId, request.email().trim())
                .map(this::toResponse)
                .orElseGet(() -> createContact(userId, request));
        }
        return createContact(userId, request);
    }

    private ContactResponse toResponse(Contact contact) {
        return new ContactResponse(
            contact.getId(),
            contact.getUserId(),
            contact.getName(),
            contact.getEmail(),
            contact.getLinkedinUrl(),
            contact.getCompany(),
            contact.getTitle(),
            contact.getCreatedAt(),
            contact.getUpdatedAt()
        );
    }

    public static class ContactNotFoundException extends RuntimeException {
        public ContactNotFoundException(UUID id) {
            super("Contact not found: " + id);
        }
    }
}
