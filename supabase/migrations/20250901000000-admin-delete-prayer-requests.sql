-- Allow administrators and pastors to delete any prayer request
-- Depends on functions public.is_admin from user roles migration

DO $$
BEGIN
  -- Enable RLS if not already
  EXECUTE 'ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN
  -- ignore if already enabled
  NULL;
END $$;

-- Admin delete policy (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prayer_requests'
      AND policyname = 'Admins can delete any prayer request'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete any prayer request" ON public.prayer_requests FOR DELETE USING (public.is_admin(auth.uid()));';
  END IF;
END $$;

-- Ensure realtime is enabled for this table so clients receive DELETE events
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_requests';
  EXCEPTION WHEN others THEN
    -- Ignore if already added
    NULL;
  END;
END $$;

