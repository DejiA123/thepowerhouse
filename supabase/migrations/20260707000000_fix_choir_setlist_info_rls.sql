-- Fix RLS policies for choir_setlist_info to allow all users (including guests) to read and write.
-- This ensures unauthenticated/guest users can share and like songwriting contributions.

ALTER TABLE public.choir_setlist_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.choir_setlist_info;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.choir_setlist_info;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.choir_setlist_info;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.choir_setlist_info;

CREATE POLICY "Allow all access" ON public.choir_setlist_info
FOR ALL
USING (true)
WITH CHECK (true);
