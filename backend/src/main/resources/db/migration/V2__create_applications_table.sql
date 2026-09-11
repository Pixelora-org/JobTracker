-- V2: Create applications table if missing
-- This migration handles cases where V1 was baselined without actually running.
-- Safe to run on existing databases: uses CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.

-- Create applications table with all columns the JPA entity needs plus search_plan from schema.sql
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  job_url text,
  track text NOT NULL CHECK (
    track IN ('Software Engineering', 'Cybersecurity', 'Other')
  ),
  resume_version text,
  status text NOT NULL CHECK (
    status IN (
      'Wishlist', 'Applied', 'OA/Assessment', 'Phone Screen',
      'Interview', 'Offer', 'Rejected', 'Withdrawn', 'Ghosted'
    )
  ),
  source text NOT NULL CHECK (
    source IN (
      'LinkedIn', 'Referral', 'Company site',
      'Career fair', 'Cold outreach', 'Other'
    )
  ),
  location text,
  work_mode text CHECK (work_mode IN ('Remote', 'Hybrid', 'Onsite')),
  date_applied timestamptz,
  next_action_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add search_plan column if missing (from schema.sql)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS search_plan jsonb;

-- Create indexes if they don't exist (applications-specific indexes from schema.sql)
CREATE INDEX IF NOT EXISTS applications_user_updated_idx
  ON public.applications (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS applications_user_status_idx
  ON public.applications (user_id, status);

-- Grant permissions to table owner/postgres role so JDBC connections work
-- Table owner bypasses RLS in Postgres, so these grants work even with RLS enabled
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO postgres;
