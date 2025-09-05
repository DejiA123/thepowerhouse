-- Fix user_preferences table constraints and ensure proper upsert behavior
-- This migration addresses the duplicate key constraint violation issue

-- First, let's ensure the user_preferences table has the correct structure
-- Check if the table exists and has the right columns
DO $$ 
BEGIN 
    -- Create user_preferences table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'user_preferences' 
                   AND table_schema = 'public') THEN
        CREATE TABLE public.user_preferences (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            notifications_enabled BOOLEAN DEFAULT true,
            audio_quality TEXT DEFAULT 'high',
            theme TEXT DEFAULT 'light',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(user_id)
        );
    END IF;
END $$;

-- Ensure the unique constraint on user_id exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'user_preferences' 
                   AND constraint_name = 'user_preferences_user_id_key'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Add missing columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' 
                   AND column_name = 'notifications_enabled' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' 
                   AND column_name = 'audio_quality' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD COLUMN audio_quality TEXT DEFAULT 'high';
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' 
                   AND column_name = 'theme' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD COLUMN theme TEXT DEFAULT 'light';
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' 
                   AND column_name = 'created_at' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' 
                   AND column_name = 'updated_at' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers 
                   WHERE trigger_name = 'update_user_preferences_updated_at' 
                   AND event_object_table = 'user_preferences') THEN
        CREATE TRIGGER update_user_preferences_updated_at 
        BEFORE UPDATE ON public.user_preferences 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default preferences for existing users if they don't have any
INSERT INTO public.user_preferences (user_id, theme, notifications_enabled, audio_quality)
SELECT 
    id,
    'light' as theme,
    true as notifications_enabled,
    'high' as audio_quality
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id) DO NOTHING;
