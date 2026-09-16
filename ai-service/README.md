# Pipeline AI Service

**Status**: Scaffolded - Python-only service for LLM-powered features  
**Last updated**: 2026-09-11

## Overview

Dedicated Python microservice for AI/LLM features in the Pipeline job tracker. All real AI functionality must live here, never in the Java backend.

This service is scaffolded and ready for migration from the current frontend AI implementation.

## Architecture Decision

**Locked product decision**: Real LLM/AI code lives in this top-level `ai-service/` as **Python-only**. The Java backend (`backend/src/main/java/io/pipeline/ai/`) will never grow AI logic.

## Tech Stack

- **Framework**: FastAPI 0.115
- **Runtime**: Python 3.12
- **LLM**: Google Gemini (via `google-generativeai`)
- **Deployment**: Railway (Dockerfile-based)
- **Testing**: pytest + httpx

## Prerequisites

- Python 3.12+
- pip or uv for dependency management

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key | Yes | `AIza...` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | No | `http://localhost:3000,https://pipeline.vercel.app` |
| `PORT` | HTTP port | No | `8001` (default) |
| `AI_MODEL` | Gemini model to use | No | `gemini-3.1-flash-lite` (default) |
| `REQUIRE_AUTH` | Enable Clerk JWT validation | No | `false` (dev), `true` (prod) |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (if auth enabled) | No | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key (if auth enabled) | No | `sk_test_...` |

### Getting API Keys

1. **Google Gemini**: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create API key
   - Free tier available for development
   - Current frontend uses `gemini-3.1-flash-lite`

## Running Locally

### Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GOOGLE_GENERATIVE_AI_API_KEY="your-key-here"
export CORS_ALLOWED_ORIGINS="http://localhost:3000"

# Run the service
python main.py
# or
uvicorn main:app --reload --port 8001
```

The API will be available at http://localhost:8001

### With Docker

```bash
docker build -t pipeline-ai-service .

docker run -p 8001:8001 \
  -e GOOGLE_GENERATIVE_AI_API_KEY="your-key-here" \
  -e CORS_ALLOWED_ORIGINS="http://localhost:3000" \
  pipeline-ai-service
```

## Current Endpoints

### Health & Status
- `GET /` - Root endpoint, service info
- `GET /health` - Health check with AI configuration status
- `GET /api/v1/health` - Versioned health check

### Outreach AI (✅ Implemented)
- `POST /api/v1/outreach/draft` - Generate cold outreach drafts (LinkedIn + email)

### Search Planning (✅ Implemented)
- `POST /api/v1/search-plan/generate` - Generate contact search strategies

## Testing

```bash
# Install dev dependencies (included in requirements.txt)
pip install -r requirements.txt

# Run tests
pytest

# With coverage
pytest --cov=. --cov-report=html

# Watch mode
pytest --watch
```

## Deployment to Railway

This service is designed for Railway deployment:

1. Railway auto-detects the Dockerfile
2. Set environment variables in Railway dashboard:
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `CORS_ALLOWED_ORIGINS`
3. Railway provides `$PORT` automatically
4. Health check endpoint: `/health`

## Migration Path from Frontend

### Current State (Verified 2026-09-11)

The frontend currently has working AI features in TypeScript:

| Module | Location | Purpose | Status |
|--------|----------|---------|--------|
| `outreach.ts` | `frontend/src/lib/ai/` | Draft cold emails and LinkedIn notes | ✅ Production |
| `extract.ts` | `frontend/src/lib/ai/` | Parse pasted job postings into structured data | ✅ Production |
| `job-search.ts` | `frontend/src/lib/ai/` | Generate job search parameters from profile | ✅ Production |
| `search-plan.ts` | `frontend/src/lib/ai/` | Create contact search strategies | ✅ Production |
| `strategy.ts` | `frontend/src/lib/ai/` | Generate activity goals and tracking plans | ✅ Production |
| `model.ts` | `frontend/src/lib/ai/` | Shared Google Gemini client | ✅ Production |
| `schemas.ts` | `frontend/src/lib/ai/` | Zod schemas for structured output | ✅ Production |

**Stack in frontend**:
- Vercel AI SDK (`generateObject` from `"ai"`)
- `@ai-sdk/google` for Gemini integration
- Zod for schema validation
- Model: `gemini-3.1-flash-lite` (free tier, fast)

### Migration Strategy (Phase by Phase)

**DO NOT break production outreach/strategy in one PR.** Migrate incrementally behind feature flags or as parallel implementations.

#### Phase 1: Outreach Agent v1 Migration (✅ THIS PR - COMPLETED)
- ✅ Create Python FastAPI service
- ✅ Health endpoints
- ✅ Dockerfile for Railway
- ✅ Implement `POST /api/v1/outreach/draft`
- ✅ Implement `POST /api/v1/search-plan/generate`
- ✅ Frontend AI service client (`lib/api/ai-service-client.ts`)
- ✅ Update actions to route through ai-service (with feature flag)
- ✅ Comprehensive tests
- ✅ Documentation

**Migration Status**: Outreach Agent v1 is **ready to migrate**. Frontend can now call ai-service instead of running Gemini locally.

**Feature Flag**: Set `USE_AI_SERVICE=true` in frontend `.env.local` to enable ai-service routing.

#### Phase 2: Enable in Production (NEXT)
**Suggested first candidate**: `outreach.ts` (clean input/output, high value)

1. Implement `POST /api/v1/outreach/draft` in Python
   - Accept same input as TypeScript `draftOutreach()`
   - Return same output shape
   - Use `google-generativeai` library
   - Structured output with Pydantic (equivalent to Zod)

2. Add authentication (Clerk JWT validation)
   - Validate `Authorization: Bearer <token>` header
   - Extract `sub` claim for user isolation

3. Frontend changes:
   - Add feature flag `NEXT_PUBLIC_USE_AI_SERVICE`
   - Create `lib/api/ai-client.ts` to call the service
   - Update `lib/ai/outreach.ts` to:
     ```typescript
     if (process.env.NEXT_PUBLIC_USE_AI_SERVICE === 'true') {
       return await callAiService('outreach/draft', context);
     }
     // Fallback to local implementation
     return localDraftOutreach(context);
     ```

4. Test end-to-end
5. Deploy with flag OFF (safe rollout)
6. Enable flag for 10% of users
7. Monitor latency/errors
8. Roll out to 100%
9. Remove local implementation after stabilization

**Python Implementation Notes**:
- Use `google.generativeai.GenerativeModel` for Gemini
- Use `generation_config` with `response_mime_type="application/json"` for structured output
- Map Zod schemas to Pydantic models
- Keep prompt templates identical to frontend version

#### Phase 3: Migrate Remaining Endpoints (FUTURE)

Priority order (suggest):
1. `extract.ts` - Second most used, clear boundaries
2. `strategy.ts` - Similar to outreach, structured output
3. `search-plan.ts` - Complex but standalone
4. `job-search.ts` - Simple transformation

For each:
- Follow same pattern as Phase 2
- Feature flag per endpoint
- Keep frontend working until migration proven
- Can run frontend and service in parallel during migration

#### Phase 4: Remove Frontend AI (FAR FUTURE)

Only after ALL endpoints migrated and stable:
1. Remove `frontend/src/lib/ai/*` files
2. Remove `@ai-sdk/google` dependency
3. Remove `GOOGLE_GENERATIVE_AI_API_KEY` from frontend env
4. Keep only `lib/api/ai-client.ts` for service calls

### Authentication Flow

Future AI service endpoints will require Clerk JWT:

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_clerk_jwt(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # TODO: Validate JWT against Clerk's JWKS endpoint
    # Extract user_id from 'sub' claim
    # Return user_id for request context
    pass
```

See `backend/src/main/java/io/pipeline/gateway/config/SecurityConfig.java` for reference JWT validation logic.

## API Design Guidelines

When implementing endpoints:

1. **Versioning**: All endpoints under `/api/v1/`
2. **RESTful**: Use appropriate HTTP verbs
3. **Request/Response**: Pydantic models for validation
4. **Errors**: Use FastAPI's HTTPException with clear messages
5. **Logging**: Structured JSON logs for production
6. **Timeouts**: LLM calls should have reasonable timeouts (30s max)
7. **Rate Limiting**: Add per-user rate limits in production

## Example Future Endpoint

```python
from pydantic import BaseModel, Field

class OutreachRequest(BaseModel):
    company: str
    role: str
    track: str
    template: str = Field(..., pattern="^(recruiter|teammate|alum)$")
    contact_name: str | None = None
    applicant_name: str
    about: str | None = None

class OutreachResponse(BaseModel):
    connection_note: str
    email_subject: str
    email_body: str

@app.post("/api/v1/outreach/draft", response_model=OutreachResponse)
async def draft_outreach(
    request: OutreachRequest,
    user_id: str = Depends(verify_clerk_jwt)
):
    # Call Gemini API with structured output
    # Return formatted outreach
    pass
```

## Directory Structure (Current)

```
ai-service/
├── main.py                  # FastAPI app, health endpoints
├── requirements.txt         # Python dependencies
├── Dockerfile              # Railway deployment
├── pytest.ini              # Test configuration
├── test_main.py            # Tests for health endpoints
├── .gitignore              # Python-specific ignores
└── README.md               # This file
```

## Directory Structure (Future)

```
ai-service/
├── main.py                  # FastAPI app entry point
├── requirements.txt
├── Dockerfile
├── pytest.ini
├── .gitignore
├── README.md
├── app/
│   ├── __init__.py
│   ├── models/              # Pydantic request/response models
│   ├── services/            # Business logic, LLM calls
│   │   ├── outreach.py
│   │   ├── extract.py
│   │   ├── search_plan.py
│   │   └── strategy.py
│   ├── routers/             # FastAPI routers (endpoints)
│   │   ├── outreach.py
│   │   ├── extract.py
│   │   └── health.py
│   ├── auth.py              # Clerk JWT validation
│   └── config.py            # Settings from env vars
├── tests/
│   ├── test_outreach.py
│   ├── test_extract.py
│   └── test_integration.py
└── prompts/                 # Prompt templates (version controlled)
    ├── outreach_recruiter.txt
    ├── outreach_teammate.txt
    └── ...
```

## Development Guidelines

1. **Keep prompts version-controlled**: Store LLM prompts in dedicated files or constants, not scattered in code
2. **Test with real API**: Integration tests should call actual Gemini API (use dev key, low quota)
3. **Mock for unit tests**: Use `unittest.mock` for fast unit tests
4. **Log LLM calls**: Track prompt tokens, latency, and model versions
5. **Handle failures gracefully**: LLMs can timeout, return invalid JSON, or hit rate limits
6. **Monitor costs**: Track API usage per user/endpoint

## Troubleshooting

### Service won't start
- Check Python version: `python --version` (need 3.12+)
- Verify dependencies installed: `pip list`
- Check for port conflicts on 8001

### Health check shows `ai_configured: false`
- Set `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
- Verify key is valid in [Google AI Studio](https://aistudio.google.com/)

### Tests failing
- Install test dependencies: `pip install -r requirements.txt`
- Check pytest is using correct Python: `pytest --version`
- Run with verbose: `pytest -v`

### CORS errors from frontend
- Add frontend origin to `CORS_ALLOWED_ORIGINS`
- Check browser console for specific error
- Verify origin includes protocol and port

## Contributing

This service is owned by the AI features teammate. When adding features:

1. Add endpoint to appropriate router module
2. Add Pydantic models for request/response
3. Implement service logic in `app/services/`
4. Add integration tests
5. Update this README with new endpoints
6. Document any new environment variables

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Generative AI Python SDK](https://github.com/google/generative-ai-python)
- [Vercel AI SDK](https://sdk.vercel.ai/) (current frontend implementation)
- [Pipeline Architecture Docs](../docs/architecture.md)
- Frontend AI implementation: `frontend/src/lib/ai/`
