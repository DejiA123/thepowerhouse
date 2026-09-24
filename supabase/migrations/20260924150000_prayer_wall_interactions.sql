-- Prayer Wall: "I'm praying" with counts, hide-my-name posts and answered prayers.

ALTER TABLE public.prayer_requests ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE public.prayer_requests ADD COLUMN IF NOT EXISTS answered_at timestamptz;
ALTER TABLE public.prayer_requests ADD COLUMN IF NOT EXISTS testimony text;

CREATE TABLE IF NOT EXISTS public.prayer_request_prayers (
  prayer_request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prayer_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS prayer_request_prayers_request_idx ON public.prayer_request_prayers (prayer_request_id);

ALTER TABLE public.prayer_request_prayers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_request_prayers' AND policyname = 'Anyone signed in can see who is praying') THEN
    CREATE POLICY "Anyone signed in can see who is praying" ON public.prayer_request_prayers
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_request_prayers' AND policyname = 'People add their own prayer') THEN
    CREATE POLICY "People add their own prayer" ON public.prayer_request_prayers
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'prayer_request_prayers' AND policyname = 'People remove their own prayer') THEN
    CREATE POLICY "People remove their own prayer" ON public.prayer_request_prayers
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Live counts on the wall
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_request_prayers;
  EXCEPTION WHEN others THEN
    NULL; -- already added
  END;
END $$;
