-- Sync Vocal Training Resources Across All Locations
-- This migration copies existing vocal exercises from Galway to all other choir portals.

DO $$
DECLARE
    loc TEXT;
    target_locations TEXT[] := ARRAY['kildare', 'athlone', 'dublin', 'national'];
BEGIN
    FOR loc IN SELECT unnest(target_locations)
    LOOP
        -- Insert from Galway if it doesn't already exist in the target location
        INSERT INTO public.choir_instrumental_resources (title, type, url, location)
        SELECT 
            source.title, 
            source.type, 
            source.url, 
            loc
        FROM public.choir_instrumental_resources source
        WHERE source.location = 'galway' 
          AND (source.type LIKE 'Academy: vocal-101%' OR source.type = 'Academy: vocal-101')
          AND NOT EXISTS (
              SELECT 1 
              FROM public.choir_instrumental_resources target
              WHERE target.location = loc 
                AND target.title = source.title
                AND target.type = source.type
          );
    END LOOP;
END $$;
