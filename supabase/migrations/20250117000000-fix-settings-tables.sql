-- Fix settings tables to match the application requirements

-- Add missing columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS low_light_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reduce_motion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS color_blindness TEXT DEFAULT 'none';

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  general_notifications BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  daily_scripture BOOLEAN DEFAULT true,
  reading_reminders BOOLEAN DEFAULT true,
  reading_plan_updates BOOLEAN DEFAULT true,
  verse_of_the_day BOOLEAN DEFAULT true,
  new_messages BOOLEAN DEFAULT true,
  group_updates BOOLEAN DEFAULT true,
  friend_requests BOOLEAN DEFAULT true,
  mentions BOOLEAN DEFAULT true,
  upcoming_events BOOLEAN DEFAULT true,
  event_reminders BOOLEAN DEFAULT true,
  event_updates BOOLEAN DEFAULT true,
  new_content BOOLEAN DEFAULT true,
  content_updates BOOLEAN DEFAULT true,
  announcements BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '09:00',
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS for user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can view their own notification preferences" ON public.user_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification preferences" ON public.user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger to update updated_at column for user_notification_preferences
CREATE TRIGGER update_user_notification_preferences_updated_at 
  BEFORE UPDATE ON public.user_notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 