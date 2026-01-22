-- COMPREHENSIVE REPAIR FOR CHOIR TABLES
-- Run this in your Supabase SQL Editor to fix 401/42501 errors

-- 1. Ensure choir_setlist_info has the correct unique constraint for UPSERT
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'choir_setlist_info_type_location_unique') THEN
        ALTER TABLE choir_setlist_info ADD CONSTRAINT choir_setlist_info_type_location_unique UNIQUE (info_type, location);
    END IF;
END $$;

-- 2. RESET RLS for all choir tables to be MORE PERMISSIVE (works for guests AND logged-in users)
-- This is recommended for development to ensure functionality works first.

DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'choir_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Allow all access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t);
        -- Also drop some old policy names that might be lurking
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.%I;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.%I;', t);
    END LOOP;
END $$;

-- 3. Specifically verify setlist_info is open
DROP POLICY IF EXISTS "Allow all access" ON public.choir_setlist_info;
CREATE POLICY "Allow all access" ON public.choir_setlist_info
FOR ALL
USING (true)
WITH CHECK (true);
