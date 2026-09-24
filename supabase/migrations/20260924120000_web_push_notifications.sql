-- Web Push (PWA) notifications
-- One row per browser/device push subscription. A device can be anonymous
-- (e.g. a choir member who is not signed in) and still follow topics such as
-- "choir:<location>". Rows are managed only by the push-subscribe / send-push
-- edge functions (service role), so no client RLS policies are granted.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  user_agent TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_topics_idx
  ON public.push_subscriptions USING GIN (topics);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Calls: make sure call rows stream over realtime so ringing/ended states sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
  END IF;
END $$;

-- Participants may update the status of calls in their chats (answer / end / missed)
DROP POLICY IF EXISTS "Participants can update call status" ON public.call_sessions;
CREATE POLICY "Participants can update call status"
ON public.call_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = call_sessions.chat_id AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.chat_id = call_sessions.chat_id AND cp.user_id = auth.uid()
  )
);

-- Members can leave a group themselves
DROP POLICY IF EXISTS "Users can leave chats" ON public.chat_participants;
CREATE POLICY "Users can leave chats"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
