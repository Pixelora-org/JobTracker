# Outreach AI Migration to Python Service

## Overview

This document describes the migration of Outreach Agent v1 LLM features from the Next.js frontend to the dedicated Python `ai-service`.

**Status**: ✅ Code complete, ready for deployment testing  
**PR**: Branch `cursor/peel-outreach-ai-to-python-5d1e` → `pre-production`

## What Changed

### Backend: Python AI Service

**New endpoints** (both require Gemini API key):
1. `POST /api/v1/outreach/draft` - Generate LinkedIn note + cold email
2. `POST /api/v1/search-plan/generate` - Generate contact search personas and queries

**Tech stack**:
- FastAPI 0.115
- `google-generativeai` Python SDK
- Pydantic for request/response validation
- Structured output matching TypeScript implementation

**Authentication** (optional):
- Clerk JWT validation via `Authorization: Bearer <token>`
- Disabled by default (`REQUIRE_AUTH=false`)
- Enable in production with `REQUIRE_AUTH=true`

### Frontend: Service Client

**New module**: `frontend/src/lib/api/ai-service-client.ts`
- Typed functions: `draftOutreach()`, `generateSearchPlan()`
- Error handling with `AiServiceError`
- Connects to `AI_SERVICE_URL` (default: `http://localhost:8001`)

**Updated**: `frontend/src/lib/actions/outreach.ts`
- Feature flag: `USE_AI_SERVICE` (env: `USE_AI_SERVICE=true`)
- Routes to Python service when flag is on
- Falls back to local TypeScript implementation when flag is off
- **No UI changes**: OutreachPanelV2 unchanged

### Original Code Preserved

The following TypeScript modules are **still present and functional**:
- `frontend/src/lib/ai/outreach.ts` - Local draft generation
- `frontend/src/lib/ai/search-plan.ts` - Local search plan generation
- `frontend/src/lib/ai/model.ts` - Gemini client
- `frontend/src/lib/ai/schemas.ts` - Zod schemas

These will be removed in a future PR after the migration is proven stable.

## Environment Variables

### AI Service (Python)

Add to `ai-service/.env` or Railway dashboard:

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Optional
AI_MODEL=gemini-3.1-flash-lite  # default
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://pipeline-staging.vercel.app
PORT=8001  # Railway provides this
REQUIRE_AUTH=false  # set true in production
```

### Frontend (Next.js)

Add to `frontend/.env.local` (and Vercel Preview/Production settings):

```bash
# Required for ai-service routing
AI_SERVICE_URL=http://localhost:8001  # dev
# AI_SERVICE_URL=https://ai-service-production.up.railway.app  # prod

# Feature flag
USE_AI_SERVICE=false  # set true to enable migration

# Keep existing (fallback when flag is off)
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
```

## Testing Locally

### 1. Start AI Service

```bash
cd ai-service

# Install dependencies
pip install -r requirements.txt

# Set env
export GOOGLE_GENERATIVE_AI_API_KEY="your-key"
export CORS_ALLOWED_ORIGINS="http://localhost:3000"

# Run
python main.py
# or
uvicorn main:app --reload --port 8001
```

Verify: <http://localhost:8001/health>

### 2. Start Frontend

```bash
cd frontend

# Enable ai-service routing
echo "USE_AI_SERVICE=true" >> .env.local
echo "AI_SERVICE_URL=http://localhost:8001" >> .env.local

# Run
npm run dev
```

### 3. Test Outreach Flow

1. Go to an application card
2. Open "Outreach" tab
3. Click "Build Search Plan" → should call Python `/api/v1/search-plan/generate`
4. Search contacts, select one
5. Click "Generate Draft" → should call Python `/api/v1/outreach/draft`

**Verify in browser DevTools Network tab**: requests go to `localhost:8001/api/v1/*`

## Deployment Plan

### Step 1: Deploy AI Service to Railway

1. Push this branch to GitHub
2. Railway auto-detects `ai-service/Dockerfile`
3. Set environment variables in Railway dashboard:
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `CORS_ALLOWED_ORIGINS` (include staging + production Vercel URLs)
   - `REQUIRE_AUTH=false` (start permissive, tighten later)
4. Note the Railway public URL (e.g., `https://ai-service-pre-production.up.railway.app`)

### Step 2: Deploy Frontend to Vercel Preview

1. This PR branch auto-deploys to Vercel Preview
2. Add Preview environment variables:
   - `AI_SERVICE_URL=https://ai-service-pre-production.up.railway.app`
   - `USE_AI_SERVICE=false` (keep flag OFF initially)
3. Test manually with flag OFF → should use local TypeScript (existing behavior)

### Step 3: Enable Feature Flag (Staged Rollout)

**Option A: Test on one preview deployment first**
- Set `USE_AI_SERVICE=true` on one specific Preview deployment
- Manually test the full outreach flow
- Monitor Railway logs for errors

**Option B: Merge to pre-production with flag OFF**
- Merge PR with `USE_AI_SERVICE=false` in production
- AI service is deployed but not used yet
- Flip flag to `true` in Vercel dashboard when ready
- No code deploy needed to enable

**Recommended**: Option B for safest rollout.

### Step 4: Monitor & Rollback Plan

**Monitor**:
- Railway logs: `railway logs -f` (ai-service)
- Vercel logs: Runtime logs for frontend
- User reports: "Could not draft outreach" errors

**Rollback**:
- Fast: Set `USE_AI_SERVICE=false` in Vercel (instant)
- Slow: Revert PR and redeploy

## Authentication (Future)

Currently `REQUIRE_AUTH=false`. To enable Clerk JWT validation:

1. Set `REQUIRE_AUTH=true` on ai-service
2. Pass Clerk session token from frontend:
   ```typescript
   const { getToken } = useAuth();
   const token = await getToken();
   await aiService.draftOutreach(request, { auth: token });
   ```
3. Update `frontend/src/lib/api/ai-service-client.ts` to accept and forward token

**Note**: This requires server-side Clerk token extraction in actions. Not implemented in this PR.

## What Remains in Frontend AI

These modules are **not migrated** in this PR:

| Module | Purpose | Migration Status |
|--------|---------|------------------|
| `extract.ts` | Parse job postings into structured data | 🔴 Not started |
| `job-search.ts` | Generate search params from profile | 🔴 Not started |
| `strategy.ts` | Generate activity goals | 🔴 Not started |

Migrate these in future PRs using the same pattern:
1. Implement endpoint in Python `ai-service`
2. Add route to `main.py`
3. Call from frontend via `ai-service-client.ts`
4. Feature flag in actions
5. Test and enable

## Testing

Run Python tests:
```bash
cd ai-service
pytest
```

Coverage includes:
- Health endpoints
- Outreach draft generation (multiple templates, channels, edge cases)
- Search plan generation (campus vs. senior roles, normalization)
- Request validation (missing fields, invalid enums)

## Known Limitations

1. **No LLM mocking in tests**: Tests call real Gemini API (requires valid API key, uses quota)
2. **Auth not enforced**: `REQUIRE_AUTH=false` by default (fine for private VPC)
3. **No rate limiting**: Add per-user rate limiting in production
4. **JWKS verification incomplete**: JWT decode without signature verification (dev mode)

## Success Criteria

✅ **This PR is done when**:
- [ ] AI service deployed to Railway pre-production
- [ ] Frontend merged to `pre-production` with `USE_AI_SERVICE=false`
- [ ] Manual test with flag ON shows Python service working
- [ ] Feature flag flipped to ON in production
- [ ] Monitoring shows no errors over 24 hours
- [ ] Original TypeScript AI code removed in follow-up PR

## Questions?

- **Why keep TypeScript code?** Safe rollback. Remove after migration proven stable.
- **Why feature flag?** Zero-downtime migration. Can enable/disable instantly.
- **Why Python not Java?** Product decision: all LLM code in Python for ML/AI ecosystem compatibility.
- **What about rate limits?** Add middleware later (e.g., `slowapi` for FastAPI).
