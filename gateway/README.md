# Gateway Service (Future)

**Status**: Reserved for Phase 4 service split

This directory is currently a placeholder. The gateway functionality is implemented in the `backend/` directory under the `io.pipeline.gateway` package.

## Future Purpose

When the monolithic backend is split into microservices (Phase 4), this directory will contain:

- API Gateway service
- Request routing
- Authentication/authorization
- Rate limiting
- API composition/aggregation

## Current Implementation

For now, see `backend/src/main/java/io/pipeline/gateway/`:
- `config/` - Security, CORS configuration
- `controller/` - REST API endpoints
- `dto/` - Request/response models

Refer to [`docs/architecture.md`](../docs/architecture.md) for the full migration plan.
