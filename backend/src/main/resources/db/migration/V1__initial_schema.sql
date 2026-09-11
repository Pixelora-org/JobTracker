-- Initial schema baseline
-- This migration assumes the Supabase schema already exists.
-- Flyway will validate that the applications table matches what JPA expects.

-- The applications table is already created by Supabase schema.sql
-- This file serves as a baseline for Flyway migration tracking.
-- Actual schema is maintained in frontend/supabase/schema.sql

-- Verify table exists (will fail if not present)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'applications') THEN
        RAISE EXCEPTION 'applications table does not exist. Run Supabase schema first.';
    END IF;
END $$;
