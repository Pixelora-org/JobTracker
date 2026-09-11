# Pipeline Architecture

**Status**: In progress - Phase 1 (backend scaffold) implemented  
**Last updated**: 2026-09-10

## Overview

Pipeline is migrating from a pure Next.js + Supabase architecture to a hybrid architecture with a Spring Boot backend. The strategy is a **strangler pattern migration** — incrementally moving domains from the frontend to the backend while keeping the system working end-to-end.

## Current Architecture (Before Migration)

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
│                 │
│ • UI/UX         │
│ • Server        │
│   Actions       │
│ • Direct DB     │
│   queries       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Supabase      │
│                 │
│ • PostgreSQL    │
│ • Storage       │
│ • RLS Policies  │
└─────────────────┘
```

**Stack:**
- Frontend: Next.js 16, React 19, deployed to Vercel
- Database: Supabase (PostgreSQL 15+)
- Auth: Clerk (replaced Supabase Auth)
- Storage: Supabase Storage (resume files)

## Target Architecture (After Migration)

```
┌─────────────────┐
│   Next.js App   │         ┌──────────────┐
│   (Frontend)    │────────▶│   Gateway    │
│                 │         │   Service    │
│ • UI/UX         │         │              │
│ • No direct DB  │         │ • REST API   │
└─────────────────┘         │ • Auth/JWT   │
                            │ • CORS       │
                            └──────┬───────┘
                                   │
                      ┌────────────┴────────────┐
                      ↓                         ↓
              ┌──────────────┐         ┌──────────────┐
              │    Core      │         │  AI Service  │
              │   Service    │         │              │
              │              │         │ • LLM calls  │
              │ • Business   │         │ • Embeddings │
              │   Logic      │         │ • AI feats   │
              │ • DB access  │         └──────────────┘
              └──────┬───────┘
                     │
                     ↓
              ┌──────────────┐
              │  Supabase    │
              │              │
              │ • PostgreSQL │
              │ • Storage    │
              └──────────────┘
```

**Target Stack:**
- Frontend: Next.js 16, React 19, Vercel (unchanged)
- Backend: Spring Boot 3.4, Java 21, Railway
- Database: Supabase PostgreSQL (schema unchanged)
- Auth: Clerk (frontend) → JWT validation (backend)
- Storage: Supabase Storage (accessed via backend API later)

## Migration Phases

### Phase 1: Backend Scaffold (Current - IN PROGRESS)

**Goal:** Single Spring Boot app with applications API slice, ready to deploy but not yet wired to frontend.

**Deliverables:**
- ✅ Spring Boot 3.4 + Java 21 project in `backend/`
- ✅ Package structure: `gateway`, `core` (no AI in Java)
- ✅ Health endpoint (`/api/v1/health`, `/actuator/health`)
- ✅ Applications CRUD API (`/api/v1/applications`)
  - List (with optional status filter)
  - Get by ID
  - Create
  - Update
  - Delete
- ✅ JPA entities matching Supabase `applications` table
- ✅ Clerk JWT validation (OAuth2 Resource Server)
- ✅ CORS config for Vercel frontend
- ✅ Dockerfile for Railway deployment
- ✅ CI workflow for backend (`mvn verify`)
- ✅ Documentation (this file + `backend/README.md`)

**Not Yet Done:**
- Frontend does not call the backend (still uses Supabase directly)
- No deployment to Railway
- No integration tests with real DB

**Tech Notes:**
- Single JAR deployment
- Flyway for migration tracking (baseline on existing schema)
- Row-level security enforced at application level (all queries filtered by `userId`)
- `userId` extracted from Clerk JWT `sub` claim

### Phase 2: Applications Domain Migration (NEXT)

**Goal:** Frontend calls backend for applications CRUD; Supabase becomes backend-only.

**Tasks:**
- [ ] Deploy backend to Railway
- [ ] Add `NEXT_PUBLIC_API_URL` to frontend environment
- [ ] Create `lib/api/applications.ts` client in frontend
- [ ] Update `lib/actions/applications.ts` to call backend API instead of Supabase
- [ ] Test end-to-end: frontend → backend → Supabase
- [ ] Remove direct Supabase `applications` queries from frontend
- [ ] Update frontend to attach Clerk JWT token to API requests

**Success Criteria:**
- Applications board/table loads from backend API
- Create/edit/delete applications works via backend
- No direct `applications` queries in Next.js server actions
- No frontend behavior changes visible to users

**Risk Mitigation:**
- Feature flag for backend API vs. direct Supabase (fast rollback)
- Canary deployment (10% traffic to backend first)

### Phase 3: Expand Backend Coverage (FUTURE)

**Domains to Migrate (in order):**

1. **Touchpoints** — messages sent to contacts
2. **Contacts** — people the user knows
3. **Strategies** — activity goals and tracking
4. **Resumes** — file metadata (Supabase Storage stays for files)

Each domain follows the same pattern:
1. Add entity, repository, service, controller to backend
2. Deploy backend update
3. Update frontend to call new API
4. Remove Supabase direct access for that domain

**Not Migrated:**
- Supabase Storage (resume files) remains as-is
- Realtime subscriptions (used for pods/messages) stay on Supabase
- Clerk auth frontend integration unchanged

### Phase 4: AI Service Migration (IN PROGRESS)

**Goal:** Migrate AI functionality from frontend TypeScript to dedicated Python service.

**Status:** `ai-service/` Python FastAPI service scaffolded and ready for migration.

**Structure:**

```
ai-service/           (Python FastAPI - IN PROGRESS)
  ├── main.py                   # FastAPI app, health endpoints
  ├── requirements.txt          # Python dependencies
  ├── Dockerfile               # Railway deployment
  ├── test_main.py             # Tests
  └── README.md                # Migration plan
```

**Current AI Implementation:**
- Location: `frontend/src/lib/ai/*.ts` (TypeScript)
- Stack: Vercel AI SDK + Google Gemini
- Features: outreach drafts, extraction, job search, strategy generation

**Migration Strategy:**
1. ✅ Scaffold Python service with health endpoints
2. Implement first endpoint (outreach) behind feature flag
3. Test and roll out gradually
4. Migrate remaining endpoints one by one
5. Remove frontend AI code when all migrated

**Tech Stack:**
- Python 3.12 + FastAPI
- Google Gemini API (`google-generativeai`)
- Pydantic for structured output
- Clerk JWT validation (same as backend)

See `ai-service/README.md` for detailed migration plan.

### Phase 5: Service Split (LONG-TERM)

**Goal:** Split the monolithic Java backend into separate gateway and core services.

**Structure:**

```
backend/              (current monolith, becomes deprecated)
gateway/              (new repo/service - Java)
  ├── API routing
  ├── JWT validation
  ├── Rate limiting
  └── CORS
core-service/         (new repo/service - Java)
  ├── Applications
  ├── Touchpoints
  ├── Contacts
  ├── Strategies
  └── Database access
```

**When to Split:**
- Team grows beyond 3-4 backend engineers
- Gateway needs independent deployment cadence
- Before: Validate that the split is worth the operational overhead

**Tech Stack (Future):**
- Service mesh: Istio or similar (TBD)
- API gateway: Kong or Ambassador (TBD)
- Inter-service communication: REST (internal)

## Data Flow

### Current (Phase 1)

```
User ──▶ Next.js ──▶ Supabase
                 └──▶ Backend (not yet called)
```

### After Phase 2

```
User ──▶ Next.js ──▶ Backend API ──▶ Supabase
```

### After Phase 4 (AI Service)

```
User ──▶ Next.js ──▶ Backend API ──▶ Supabase
              └──────▶ AI Service (Python, separate)
```

## Authentication Flow

### Frontend (Clerk)

1. User signs in via Clerk UI component
2. Clerk issues JWT token with claims:
   - `sub`: Clerk user ID (e.g., `user_2abc123`)
   - `iss`: Clerk issuer URL
   - `exp`: Expiration timestamp
3. Frontend includes JWT in `Authorization: Bearer <token>` header

### Backend (Spring Security)

1. Request arrives at Spring Boot
2. `SecurityConfig` extracts JWT from `Authorization` header
3. JWT signature validated against Clerk's JWKS endpoint
4. Claims validated (`iss` matches configured issuer)
5. User ID (`sub`) extracted and passed to service layer
6. All database queries filtered by this `userId`

**Security Notes:**
- No user/password storage in backend (Clerk owns auth)
- Backend is stateless (no sessions)
- JWTs are short-lived (1 hour default, refreshed by Clerk frontend SDK)
- Backend does not store or cache JWTs

## Database Schema

The backend uses the existing Supabase schema defined in `frontend/supabase/schema.sql`. No schema changes are made during migration.

**Key Tables:**
- `applications` — job applications
- `touchpoints` — outreach messages
- `contacts` — people the user knows
- `strategies` — activity goals
- `resumes` — resume metadata (files in Supabase Storage)

**RLS (Row-Level Security):**
- Supabase RLS policies remain active but become redundant
- Backend enforces user isolation at application level
- All queries include `WHERE user_id = :userId`
- Prevents accidental cross-user data leaks

**Why Keep RLS?**
- Defense in depth (multiple isolation layers)
- Supports direct Supabase queries during migration
- Protects against backend bugs/mistakes

## Deployment

### Current Setup

- **Frontend**: Vercel (automatic deploys from `production` branch)
- **Backend**: Not yet deployed (runs locally only)
- **Database**: Supabase cloud instance

### Target Setup

- **Frontend**: Vercel (unchanged)
- **Backend**: Railway
  - Dockerfile-based deployment
  - Auto-deploy from `production` branch (`backend/**` path filter)
  - Environment variables via Railway dashboard
  - Horizontal scaling available if needed
- **Database**: Supabase (unchanged)

**Railway Configuration:**
- Root directory: `backend/`
- Build: Dockerfile
- Port: `$PORT` (Railway provides this)
- Health check: `/actuator/health`

### CI/CD Pipelines

**Frontend** (`.github/workflows/frontend-ci.yml`):
- Triggers: PRs affecting `frontend/**` against `production`/`pre-production`
- Steps: `npm ci`, `npm run lint`, `npm run build`

**Backend** (`.github/workflows/backend-ci.yml`):
- Triggers: PRs affecting `backend/**` against `production`/`pre-production`
- Steps: Java 21 setup, `mvn -B verify`

**Stub Services** (gateway/core/ai CI workflows):
- Exist but do nothing (directories contain only `.gitkeep`)
- Will activate when Phase 4 service split occurs

## Environment Variables

### Frontend

```bash
# Existing (unchanged)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# New (Phase 2+)
NEXT_PUBLIC_API_URL=https://pipeline-backend.up.railway.app
```

### Backend

```bash
# Database
DATABASE_URL=jdbc:postgresql://db.xxx.supabase.co:5432/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=***

# Clerk JWT Validation
CLERK_JWKS_URI=https://clerk.pipeline.com/.well-known/jwks.json
CLERK_ISSUER=https://clerk.pipeline.com

# CORS
CORS_ALLOWED_ORIGINS=https://pipeline.vercel.app,https://pipeline-preview.vercel.app

# App Config
PORT=8080
LOG_LEVEL=INFO
```

## Monitoring & Observability

**Current (Minimal):**
- Vercel analytics for frontend
- Supabase dashboard for DB metrics

**Target (Phase 2+):**
- Spring Boot Actuator metrics (exposed at `/actuator`)
- Railway built-in metrics (CPU, memory, requests)
- Structured logging (JSON format for log aggregation)

**Future (Phase 3+):**
- Application Performance Monitoring (APM): New Relic, Datadog, or similar
- Distributed tracing (if/when services split)
- Error tracking: Sentry or similar

## Testing Strategy

### Frontend

- Unit tests: `jest` for utilities
- Integration tests: `@testing-library/react`
- E2E tests: Not yet implemented (Playwright or Cypress if needed)

### Backend

- Unit tests: JUnit 5, MockMvc for controllers
- Integration tests: `@SpringBootTest` with testcontainers (future)
- API tests: Postman/Insomnia collections (manual for now)

**Testing Goals (Phase 2+):**
- Every API endpoint has at least one integration test
- Critical paths (create/update application) have E2E tests
- Test coverage target: 70%+ (measured by JaCoCo)

## Open Questions & Decisions

### Decided

✅ **Why Spring Boot instead of Node.js backend?**
- Team has Java experience
- Strong type safety and tooling
- Better for long-term maintainability at scale
- JPA/Hibernate simplifies database access

✅ **Why strangler pattern instead of big rewrite?**
- Keeps system working during migration
- Reduces risk (incremental rollout)
- Delivers value faster (applications API first)
- Avoids "big bang" deployment

✅ **Why keep Supabase instead of moving to RDS or Cloud SQL?**
- Supabase PostgreSQL is production-ready
- Storage + Realtime features still useful
- Migration cost not justified yet
- Can revisit if Supabase becomes a bottleneck

### Open

⚠️ **When to split into microservices?**
- Wait until monolith becomes a clear bottleneck
- Requires: multiple backend devs, clear service boundaries, ops tooling in place
- Do not split prematurely

⚠️ **How to handle Supabase Realtime (pods chat, job messages)?**
- Options:
  1. Keep Realtime on Supabase (current plan)
  2. Migrate to WebSocket endpoint in backend
  3. Use managed service (Pusher, Ably)
- Decision: Defer until Phase 3, Realtime load is low

⚠️ **Should backend serve static files / uploads?**
- Currently: Supabase Storage handles resume PDFs
- Options:
  1. Keep Supabase Storage, backend proxies signed URLs
  2. Move to S3/Cloud Storage, backend generates signed URLs
  3. Backend serves files directly
- Decision: Phase 2 keeps Supabase Storage, revisit in Phase 3

## Migration Checklist

### Phase 1 (Backend Scaffold) ✅
- [x] Create `backend/` directory structure
- [x] Spring Boot project with Maven
- [x] Health endpoints
- [x] Applications CRUD API
- [x] Clerk JWT security config
- [x] CORS configuration
- [x] Dockerfile
- [x] Backend CI workflow
- [x] Documentation (README + architecture)

### Phase 2 (Applications API Integration) 🔜
- [ ] Deploy backend to Railway
- [ ] Configure environment variables
- [ ] Add API client to frontend
- [ ] Update frontend actions to call backend
- [ ] Test end-to-end flow
- [ ] Remove direct Supabase queries
- [ ] Feature flag for rollback
- [ ] Monitor API latency/errors

### Phase 3+ (Expand Coverage) 📅
- [ ] Migrate touchpoints domain
- [ ] Migrate contacts domain
- [ ] Migrate strategies domain
- [ ] Migrate resumes domain
- [ ] Add integration tests
- [ ] Set up monitoring/alerting

### Phase 4 (AI Service Migration) 🚧
- [x] Scaffold Python FastAPI service in `ai-service/`
- [x] Health endpoints
- [x] Dockerfile for Railway
- [x] Basic tests
- [x] CI workflow
- [x] Remove Java `io.pipeline.ai` package
- [ ] Implement outreach endpoint in Python
- [ ] Add Clerk JWT validation
- [ ] Feature flag in frontend
- [ ] Deploy to Railway
- [ ] Test end-to-end
- [ ] Migrate remaining endpoints (extract, strategy, search-plan, job-search)
- [ ] Remove frontend AI code when stable

## References

- [Strangler Fig Pattern (Martin Fowler)](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Spring Boot Best Practices](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Railway Deployment Docs](https://docs.railway.app/)
- [Clerk Backend Authentication](https://clerk.com/docs/backend-requests/overview)
