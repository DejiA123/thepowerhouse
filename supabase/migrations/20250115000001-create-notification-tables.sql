-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_chat_notifications BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create chat notifications table
CREATE TABLE public.chat_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  message_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  message_preview TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_chat_notifications_user_id ON public.chat_notifications(user_id);
CREATE INDEX idx_chat_notifications_is_read ON public.chat_notifications(is_read);
CREATE INDEX idx_chat_notifications_created_at ON public.chat_notifications(created_at);

-- Add RLS policies for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own notification preferences
CREATE POLICY "Users can read their own notification preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notification preferences
CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notification preferences
CREATE POLICY "Users can delete their own notification preferences" ON public.notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for chat_notifications
ALTER TABLE public.chat_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own chat notifications
CREATE POLICY "Users can read their own chat notifications" ON public.chat_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert chat notifications (for the notification service)
CREATE POLICY "Users can insert chat notifications" ON public.chat_notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own chat notifications (mark as read)
CREATE POLICY "Users can update their own chat notifications" ON public.chat_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own chat notifications
CREATE POLICY "Users can delete their own chat notifications" ON public.chat_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_preferences_updated_at 
  BEFORE UPDATE ON public.notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.chat_notifications 
  WHERE created_at < now() - interval '30 days';
END;
$$ language 'plpgsql';

-- Create a scheduled job to clean up old notifications (optional)
-- This would need to be set up in your Supabase dashboard
-- SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications();'); 