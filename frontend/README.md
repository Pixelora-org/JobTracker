# Pipeline

A job search tracker: applications, outreach, resume versions, a daily plan, and follow-ups.

Paste a posting into Quick add and it fills the form. Every application has an outreach panel. A strategy counts itself from what you already log.

Built with Next.js, Clerk, Supabase, and Gemini.

## Setup

1. Create a [Clerk](https://dashboard.clerk.com) application. Enable email and Google. Under **Configure → Integrations → Supabase**, activate the integration and copy the **Clerk domain**.
2. In Clerk, **Sessions → Customize session token**, add `"email": "{{user.primary_email_address}}"` so existing data can be claimed by email.
3. In Supabase, **Authentication → Sign In / Providers → Third-party**, add Clerk and paste that domain.
4. Run `supabase/schema.sql` in the SQL editor (safe to re-run). This also switches `user_id` to Clerk ids.
5. Copy `.env.local.example` to `.env.local` and fill in Clerk + Supabase keys. Optional: Gemini and Apollo.
6. `npm install` then `npm run dev`.

Open [http://localhost:3000](http://localhost:3000). The landing is public. After sign-in you land on `/board`.

Gemini and Apollo run on the instance keys, capped per user per day (40 AI calls, 15 email reveals) so one account cannot drain the pool.

## Going public

Set `NEXT_PUBLIC_APP_URL` to the production URL before you share the LinkedIn post, so Open Graph tags resolve. After deploy, add the production origin in the Clerk dashboard (Allowed origins / redirect URLs).
