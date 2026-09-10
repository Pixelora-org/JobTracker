# Core Service (Future)

**Status**: Reserved for Phase 4 service split

This directory is currently a placeholder. The core business logic is implemented in the `backend/` directory under the `io.pipeline.core` package.

## Future Purpose

When the monolithic backend is split into microservices (Phase 4), this directory will contain:

- Core business logic service
- Domain entities (Applications, Touchpoints, Contacts, etc.)
- Database access layer
- Business rules and validation

## Current Implementation

For now, see `backend/src/main/java/io/pipeline/core/`:
- `domain/` - JPA entities
- `repository/` - Spring Data repositories
- `service/` - Business logic

Refer to [`docs/architecture.md`](../docs/architecture.md) for the full migration plan.
