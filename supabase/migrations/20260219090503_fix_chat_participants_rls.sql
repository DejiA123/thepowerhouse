
-- Fix RLS policy for chat_participants to allow admins to add participants
-- Currently only allows users to insert themselves

CREATE POLICY "Admins can add participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.group_admins
        WHERE chat_id = chat_participants.chat_id
        AND user_id = auth.uid()
        AND can_add_members = true
    )
    OR
    (user_id = auth.uid()) -- Maintain existing ability to join active chats if needed (though already covered by other policy)
);

-- Ensure group creator is always added as an admin with all permissions
-- This happens in GroupChatService.createCustomGroup, but we should ensure 
-- the RLS allows the initial admin record creation.
-- The existing policy "Creator can add admins" should handle this.
