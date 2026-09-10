package io.pipeline.core.repository;

import io.pipeline.core.domain.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Application entities.
 * Includes methods for user-scoped queries (enforcing RLS-like behavior at app level).
 */
@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID>, 
                                               JpaSpecificationExecutor<Application> {

    List<Application> findByUserIdOrderByUpdatedAtDesc(String userId);

    List<Application> findByUserIdAndStatusOrderByUpdatedAtDesc(String userId, String status);

    Optional<Application> findByIdAndUserId(UUID id, String userId);

    void deleteByIdAndUserId(UUID id, String userId);
}
