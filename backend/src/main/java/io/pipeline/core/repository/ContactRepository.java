package io.pipeline.core.repository;

import io.pipeline.core.domain.Contact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Contact entities.
 * Provides user-scoped queries for contact management.
 */
@Repository
public interface ContactRepository extends JpaRepository<Contact, UUID>, 
                                          JpaSpecificationExecutor<Contact> {

    List<Contact> findByUserIdOrderByUpdatedAtDesc(String userId);

    Optional<Contact> findByIdAndUserId(UUID id, String userId);

    Optional<Contact> findByUserIdAndEmailIgnoreCase(String userId, String email);

    void deleteByIdAndUserId(UUID id, String userId);
}
