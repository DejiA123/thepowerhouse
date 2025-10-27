-- Fix chat_notifications spam vulnerability
-- Remove the permissive INSERT policy that allows anyone to create notifications
DROP POLICY IF EXISTS "Users can insert chat notifications" ON public.chat_notifications;

-- Create a secure trigger-based notification system
-- This function will automatically create notifications when a message is posted
CREATE OR REPLACE FUNCTION public.notify_group_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert notifications for all group members except the sender
  INSERT INTO public.chat_notifications (
    user_id, 
    group_name, 
    sender_name, 
    message_preview, 
    message_id
  )
  SELECT 
    gm.user_id,
    NEW.group_name,
    COALESCE(p.full_name, 'Unknown User'),
    LEFT(NEW.message, 100),
    NEW.id
  FROM public.group_members gm
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE gm.group_name = NEW.group_name 
    AND gm.user_id != NEW.user_id
    AND gm.user_id IS NOT NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger on group_messages to automatically notify members
DROP TRIGGER IF EXISTS trigger_notify_group_members ON public.group_messages;
CREATE TRIGGER trigger_notify_group_members
  AFTER INSERT ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_members();