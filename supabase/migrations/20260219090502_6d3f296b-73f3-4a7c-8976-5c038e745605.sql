
-- Fix #1: Allow users to update their own chat_participants row (for markAsRead)
CREATE POLICY "Users can update their own participation"
ON public.chat_participants
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix #3: Create message_reactions table for emoji reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone in the chat can view reactions
CREATE POLICY "Users can view reactions"
ON public.message_reactions
FOR SELECT
USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);
