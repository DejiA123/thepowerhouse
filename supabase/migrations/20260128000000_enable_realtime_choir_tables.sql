-- Enable real-time for choir tables
-- Description: Enables real-time subscriptions for all choir-related tables

-- Set REPLICA IDENTITY FULL to ensure DELETE events contain full row data
ALTER TABLE public.choir_folders REPLICA IDENTITY FULL;
ALTER TABLE public.choir_songs REPLICA IDENTITY FULL;
ALTER TABLE public.choir_weekly_set_songs REPLICA IDENTITY FULL;
ALTER TABLE public.choir_setlist_info REPLICA IDENTITY FULL;
ALTER TABLE public.choir_instrumental_resources REPLICA IDENTITY FULL;
ALTER TABLE public.choir_calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.choir_academy_modules REPLICA IDENTITY FULL;
ALTER TABLE public.choir_academy_quizzes REPLICA IDENTITY FULL;
ALTER TABLE public.choir_academy_questions REPLICA IDENTITY FULL;

-- Enable real-time for choir tables (with conditional logic to handle already-added tables)
DO $$
DECLARE
    table_name text;
    tables_to_add text[] := ARRAY[
        'choir_folders',
        'choir_songs', 
        'choir_weekly_set_songs',
        'choir_setlist_info',
        'choir_instrumental_resources',
        'choir_calendar_events',
        'choir_academy_modules',
        'choir_academy_quizzes',
        'choir_academy_questions'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_add
    LOOP
        -- Check if table is already in the publication
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = table_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
            RAISE NOTICE 'Added table % to supabase_realtime publication', table_name;
        ELSE
            RAISE NOTICE 'Table % already in supabase_realtime publication', table_name;
        END IF;
    END LOOP;
END $$;
