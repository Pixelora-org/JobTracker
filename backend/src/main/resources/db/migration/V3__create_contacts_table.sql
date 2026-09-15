-- V3: Create contacts table if missing
-- This migration handles the contacts table from schema.sql.
-- Safe to run on existing databases: uses CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.

-- Create contacts table with all columns the JPA entity needs
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  email text,
  linkedin_url text,
  company text NOT NULL DEFAULT '',
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index on user_id + email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_email_uidx
  ON public.contacts (user_id, lower(email))
  WHERE email IS NOT NULL AND length(trim(email)) > 0;

-- Create index on user_id + name for search
CREATE INDEX IF NOT EXISTS contacts_user_name_idx
  ON public.contacts (user_id, lower(name));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO postgres;
