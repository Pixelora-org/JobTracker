# Testing Notes for Outreach Agent v1

## Code Quality Verification

### Java Backend
✅ All Java files have correct package declarations
✅ Follows existing patterns from ApplicationController/Service/Repository
✅ DTOs match frontend type structure
✅ Flyway migration is idempotent and safe to re-run

### TypeScript Frontend
✅ Follows existing component patterns (OutreachPanel → OutreachPanelV2)
✅ Uses existing UI components and utilities
✅ Type definitions match backend DTOs
✅ Server actions follow existing pattern

## Manual Testing Checklist

### Prerequisites
1. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && mvn clean install
   ```

2. Set up environment variables:
   - **Frontend**: Copy `.env.local.example` to `.env.local` and add:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `GOOGLE_GENERATIVE_AI_API_KEY` (for AI drafts)
     - `APOLLO_API_KEY` (for contact search)
     - `NEXT_PUBLIC_API_URL=http://localhost:8080`
   
   - **Backend**: Set environment variables:
     - `DATABASE_URL` (Supabase PostgreSQL)
     - `DATABASE_USERNAME`
     - `DATABASE_PASSWORD`
     - `CLERK_JWKS_URI`
     - `CLERK_ISSUER`
     - `CORS_ALLOWED_ORIGINS=http://localhost:3000`

3. Run database migration:
   - Flyway will auto-run V3 migration on backend startup
   - Or manually run: `frontend/supabase/schema.sql` in Supabase SQL editor

4. Start services:
   ```bash
   # Terminal 1: Backend
   cd backend && mvn spring-boot:run
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

### Test Flow

#### 1. Search Plan Generation
- [ ] Navigate to an application detail page
- [ ] Click "Outreach" tab
- [ ] Verify "Build Search Plan" button appears
- [ ] Click button → AI generates search plan with 2-3 personas
- [ ] Verify LinkedIn/Google search links open with correct queries
- [ ] Verify "Browse all employees" link works
- [ ] Test "Regenerate plan" functionality

#### 2. Contact Search (Apollo)
- [ ] Enter company domain (e.g., `google.com`)
- [ ] Click "Search Contacts"
- [ ] Verify profile cards appear with:
   - Name (full or masked)
   - Title
   - Email status indicator
   - LinkedIn link (if available)
   - "Reveal" button for unrevealed contacts

#### 3. Profile Selection
- [ ] Click a profile card
- [ ] Verify card highlights with checkmark
- [ ] Verify "Selected contact" summary box appears
- [ ] Test "Reveal email" button (costs 1 Apollo credit)
   - [ ] Email should appear after reveal
   - [ ] Card should update with email address
- [ ] Click "Save Contact" button
   - [ ] Verify success message "✓ Saved"
   - [ ] Check database: `SELECT * FROM contacts ORDER BY created_at DESC LIMIT 1;`

#### 4. Draft Generation
- [ ] With a contact selected, choose message type:
   - [ ] Test "Recruiter" option
   - [ ] Test "Teammate" option
   - [ ] Test "Alum" option
- [ ] Add "About you" text (2-3 sentences)
- [ ] Click "Generate Draft"
- [ ] Verify draft appears with:
   - **Email mode**: Subject line + body (3 paragraphs + greeting/sign-off)
   - **LinkedIn mode**: Connection note (180-280 chars)
- [ ] Verify draft uses contact's real name and title (not generic)

#### 5. Draft Editing
- [ ] Edit subject line (Email mode)
- [ ] Edit body/note text
- [ ] Verify LinkedIn note character counter (max 300)
- [ ] Test "Regenerate Draft" button → new draft appears
- [ ] Verify edited text is replaced by new draft

#### 6. Copy & Send
- [ ] Click "Copy" button on subject/body/note
- [ ] Verify text is copied to clipboard
- [ ] **Email mode**: Click "Open in Mail" → verify mailto link works
- [ ] **LinkedIn mode**: Click "Open Profile" → verify LinkedIn URL works

#### 7. Log Touchpoint
- [ ] Set follow-up date
- [ ] Click "Log as Sent"
- [ ] Verify success message "✓ Logged · follow up [date]"
- [ ] Navigate to "Overview" tab → verify touchpoint appears in timeline
- [ ] Verify touchpoint is linked to saved contact (if contact was saved)
- [ ] Check database: `SELECT * FROM touchpoints ORDER BY created_at DESC LIMIT 1;`
   - [ ] Verify `contact_id` is set (if contact saved)
   - [ ] Verify `contact_email`, `contact_title`, `contact_linkedin_url` are populated

### Backend API Testing

Test contact endpoints directly:

```bash
# Get JWT token from Clerk (from browser dev tools)
export TOKEN="your-clerk-jwt-token"

# List contacts
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/contacts

# Create contact
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Recruiter",
    "email": "jane@acme.com",
    "linkedinUrl": "https://linkedin.com/in/janerecruiter",
    "company": "Acme Corp",
    "title": "Technical Recruiter"
  }' \
  http://localhost:8080/api/v1/contacts

# Find or create (should return existing if email matches)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Recruiter",
    "email": "jane@acme.com",
    "company": "Acme Corp",
    "title": "Technical Recruiter"
  }' \
  http://localhost:8080/api/v1/contacts/find-or-create

# Get contact by ID
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/contacts/{id}

# Update contact
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Senior Technical Recruiter"}' \
  http://localhost:8080/api/v1/contacts/{id}

# Delete contact
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/contacts/{id}
```

Expected responses:
- **GET /contacts**: `200 OK` with array of contacts
- **POST /contacts**: `201 Created` with contact object
- **POST /find-or-create**: `200 OK` with existing or new contact
- **GET /contacts/{id}**: `200 OK` with contact object
- **PUT /contacts/{id}**: `200 OK` with updated contact
- **DELETE /contacts/{id}**: `204 No Content`

### Edge Cases & Error Handling

#### Backend
- [ ] Test unauthorized access (no token) → `401 Unauthorized`
- [ ] Test access to another user's contact → `404 Not Found`
- [ ] Test creating contact with missing required fields → `400 Bad Request`
- [ ] Test duplicate email handling in find-or-create

#### Frontend
- [ ] Test with Apollo API disabled (no `APOLLO_API_KEY`)
- [ ] Test with AI disabled (no `GOOGLE_GENERATIVE_AI_API_KEY`)
- [ ] Test search with invalid domain → error message appears
- [ ] Test search with no results → "No contacts found" message
- [ ] Test reveal when Apollo has no email → error message
- [ ] Test draft generation with empty "About you" → should work (generic draft)
- [ ] Test draft generation with no contact selected → button disabled
- [ ] Test saving contact without email → should save with null email

### Database Verification

After testing, verify data integrity:

```sql
-- Check contacts were created
SELECT id, user_id, name, email, company, title, created_at 
FROM contacts 
ORDER BY created_at DESC 
LIMIT 10;

-- Check touchpoints are linked
SELECT t.id, t.contact_name, t.contact_email, t.contact_id, c.name as linked_contact_name
FROM touchpoints t
LEFT JOIN contacts c ON t.contact_id = c.id
WHERE t.type = 'Cold outreach'
ORDER BY t.created_at DESC
LIMIT 10;

-- Verify unique email constraint
INSERT INTO contacts (user_id, name, email, company)
VALUES ('test_user', 'Duplicate', 'existing@email.com', 'Test Corp');
-- Should fail with unique constraint violation if email already exists
```

## Known Limitations (Expected)

1. **No LinkedIn scraping**: Only uses public fields from Apollo search results
2. **No email sending**: Drafts are copy-only; user must send manually
3. **No LinkedIn auto-send**: User must copy note and paste in LinkedIn
4. **Apollo credit cost**: Revealing emails costs 1 credit per contact
5. **AI generic fallback**: If "About you" is empty, drafts may be generic

## Production Deployment Checklist

- [ ] Backend deployed to Railway with environment variables set
- [ ] Flyway migration V3 ran successfully (check logs)
- [ ] Frontend deployed to Vercel with `NEXT_PUBLIC_API_URL` pointing to Railway
- [ ] CORS configured correctly (frontend origin in `CORS_ALLOWED_ORIGINS`)
- [ ] Test full flow in staging environment
- [ ] Verify Apollo API key works in production
- [ ] Verify Gemini API key works in production
- [ ] Monitor error logs for first 24 hours after deploy

## Future Enhancements (Out of Scope for v1)

- Migrate LLM calls from frontend to `ai-service` (Python)
- Add email send connectors (Gmail, Outlook)
- Add LinkedIn send automation (if allowed)
- Add contact enrichment from additional sources
- Add bulk contact import
- Add contact tagging and filtering
- Add outreach campaign tracking
