-- Migration: Update choir_weekly_set_songs_set_type_check to allow day-specific suffixes
-- This is necessary to support Day 1, Day 2, and Day 3 tabs for the National Choir Portal

ALTER TABLE public.choir_weekly_set_songs 
DROP CONSTRAINT IF EXISTS choir_weekly_set_songs_set_type_check;

ALTER TABLE public.choir_weekly_set_songs 
ADD CONSTRAINT choir_weekly_set_songs_set_type_check 
CHECK (set_type IN (
    'praise', 'worship', 'special', 'hymns', 'thanksgiving', 'offering',
    'praise_d1', 'worship_d1', 'special_d1', 'hymns_d1', 'thanksgiving_d1', 'offering_d1',
    'praise_d2', 'worship_d2', 'special_d2', 'hymns_d2', 'thanksgiving_d2', 'offering_d2',
    'praise_d3', 'worship_d3', 'special_d3', 'hymns_d3', 'thanksgiving_d3', 'offering_d3'
));
