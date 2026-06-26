-- Songwriting Studio (Galway choir) — collaborative songwriting
-- Description: Weekly theme, WhatsApp-style collaborative contributions, and a
-- compiled "full song" assembled from the best ideas. Real-time enabled.

-- 1. Weekly theme for the songwriting studio
CREATE TABLE IF NOT EXISTS public.songwriting_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL DEFAULT 'galway',
    week_date DATE NOT NULL,
    title TEXT NOT NULL,
    scripture TEXT,
    description TEXT,
    focus_step TEXT, -- current "next step" focus key (e.g. 'chorus')
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (location, week_date)
);

-- 2. Collaborative contributions (the WhatsApp-style chat of ideas)
CREATE TABLE IF NOT EXISTS public.songwriting_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL DEFAULT 'galway',
    week_date DATE NOT NULL,
    user_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    section TEXT NOT NULL DEFAULT 'idea'
        CHECK (section IN ('hook', 'verse', 'chorus', 'bridge', 'melody', 'idea', 'other')),
    content TEXT NOT NULL,
    reply_to UUID REFERENCES public.songwriting_contributions(id) ON DELETE SET NULL,
    liked_by UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_songwriting_contributions_loc_week
    ON public.songwriting_contributions (location, week_date, created_at);

-- 3. The compiled song — lines assembled collaboratively into a full piece
CREATE TABLE IF NOT EXISTS public.songwriting_song_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL DEFAULT 'galway',
    week_date DATE NOT NULL,
    section TEXT NOT NULL DEFAULT 'verse',
    content TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_by UUID,
    added_by_name TEXT,
    source_contribution_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_songwriting_song_lines_loc_week
    ON public.songwriting_song_lines (location, week_date, sort_order);

-- RLS (open pattern, consistent with the existing choir tables)
ALTER TABLE public.songwriting_themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.songwriting_themes;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.songwriting_themes;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.songwriting_themes;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.songwriting_themes;
CREATE POLICY "Allow public read access" ON public.songwriting_themes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.songwriting_themes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.songwriting_themes FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.songwriting_themes FOR DELETE USING (true);

ALTER TABLE public.songwriting_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.songwriting_contributions;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.songwriting_contributions;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.songwriting_contributions;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.songwriting_contributions;
CREATE POLICY "Allow public read access" ON public.songwriting_contributions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.songwriting_contributions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.songwriting_contributions FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.songwriting_contributions FOR DELETE USING (true);

ALTER TABLE public.songwriting_song_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.songwriting_song_lines;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.songwriting_song_lines;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.songwriting_song_lines;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.songwriting_song_lines;
CREATE POLICY "Allow public read access" ON public.songwriting_song_lines FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.songwriting_song_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.songwriting_song_lines FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.songwriting_song_lines FOR DELETE USING (true);

-- Real-time: full row data on changes + add to the supabase_realtime publication
ALTER TABLE public.songwriting_themes REPLICA IDENTITY FULL;
ALTER TABLE public.songwriting_contributions REPLICA IDENTITY FULL;
ALTER TABLE public.songwriting_song_lines REPLICA IDENTITY FULL;

DO $$
DECLARE
    t text;
    tables_to_add text[] := ARRAY[
        'songwriting_themes',
        'songwriting_contributions',
        'songwriting_song_lines'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_add
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            RAISE NOTICE 'Added table % to supabase_realtime publication', t;
        END IF;
    END LOOP;
END $$;
