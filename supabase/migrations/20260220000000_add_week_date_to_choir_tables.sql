-- Migration: Add week_date to choir setlist tables
-- Description: Adds a week_date column to allow planning setlists for future weeks.

-- 1. Update choir_weekly_set_songs
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'choir_weekly_set_songs' AND column_name = 'week_date') THEN
        ALTER TABLE public.choir_weekly_set_songs ADD COLUMN week_date DATE;
    END IF;
END $$;

-- Update existing rows to the current week's Monday (default behavior)
-- We'll use a standard calculation for Monday of the week they were created
UPDATE public.choir_weekly_set_songs 
SET week_date = date_trunc('week', created_at)::date + interval '0 days'
WHERE week_date IS NULL;

-- 2. Update choir_setlist_info
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'choir_setlist_info' AND column_name = 'week_date') THEN
        ALTER TABLE public.choir_setlist_info ADD COLUMN week_date DATE;
    END IF;
END $$;

-- Update existing rows
UPDATE public.choir_setlist_info 
SET week_date = date_trunc('week', updated_at)::date + interval '0 days'
WHERE week_date IS NULL;

-- 3. Update Unique Constraints for choir_setlist_info
-- Remove old constraints if they exist (names can vary)
ALTER TABLE public.choir_setlist_info DROP CONSTRAINT IF EXISTS choir_setlist_info_info_type_location_key;
ALTER TABLE public.choir_setlist_info DROP CONSTRAINT IF EXISTS choir_setlist_info_type_location_unique;

-- Add new constraint that includes week_date (idempotently)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'choir_setlist_info_info_type_location_week_date_key') THEN
        ALTER TABLE public.choir_setlist_info ADD CONSTRAINT choir_setlist_info_info_type_location_week_date_key UNIQUE (info_type, location, week_date);
    END IF;
END $$;

-- 4. Set REPLICA IDENTITY FULL for real-time (already done but good to ensure)
ALTER TABLE public.choir_weekly_set_songs REPLICA IDENTITY FULL;
ALTER TABLE public.choir_setlist_info REPLICA IDENTITY FULL;
