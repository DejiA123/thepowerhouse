-- Migration: Add sort_order to choir_weekly_set_songs
-- Description: Adds a sort_order column to persist the order of songs in setlists.

-- 1. Add sort_order column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'choir_weekly_set_songs' AND column_name = 'sort_order') THEN
        ALTER TABLE public.choir_weekly_set_songs ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Initialize sort_order based on created_at for existing records
WITH OrderedSongs AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY set_type, location ORDER BY created_at) - 1 as new_order
    FROM public.choir_weekly_set_songs
)
UPDATE public.choir_weekly_set_songs
SET sort_order = OrderedSongs.new_order
FROM OrderedSongs
WHERE public.choir_weekly_set_songs.id = OrderedSongs.id;
