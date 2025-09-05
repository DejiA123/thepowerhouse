-- Fix for user names showing as "Anonymous" in group chat
-- Run this script in your Supabase SQL Editor

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add deleted_at column to group_messages table if it doesn't exist
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create YouTube API quota monitoring table
CREATE TABLE IF NOT EXISTS public.youtube_api_usage (
  id SERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  api_calls_made INTEGER DEFAULT 1,
  quota_units_used INTEGER DEFAULT 100,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  cached_response BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_created_at ON public.youtube_api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_function ON public.youtube_api_usage(function_name);

-- Function to log YouTube API usage
CREATE OR REPLACE FUNCTION public.log_youtube_api_usage(
  _function_name TEXT,
  _api_calls_made INTEGER DEFAULT 1,
  _quota_units_used INTEGER DEFAULT 100,
  _success BOOLEAN DEFAULT true,
  _error_message TEXT DEFAULT NULL,
  _cached_response BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.youtube_api_usage (
    function_name,
    api_calls_made,
    quota_units_used,
    success,
    error_message,
    cached_response
  ) VALUES (
    _function_name,
    _api_calls_made,
    _quota_units_used,
    _success,
    _error_message,
    _cached_response
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get YouTube API usage summary
CREATE OR REPLACE FUNCTION public.get_youtube_api_usage_summary(
  _hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  function_name TEXT,
  total_calls INTEGER,
  total_quota_units INTEGER,
  success_rate NUMERIC,
  cache_hit_rate NUMERIC,
  avg_quota_per_call NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yau.function_name,
    COUNT(*)::INTEGER as total_calls,
    SUM(yau.quota_units_used)::INTEGER as total_quota_units,
    ROUND(
      (COUNT(*) FILTER (WHERE yau.success = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
    ) as success_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE yau.cached_response = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
    ) as cache_hit_rate,
    ROUND(AVG(yau.quota_units_used), 2) as avg_quota_per_call
  FROM public.youtube_api_usage yau
  WHERE yau.created_at >= NOW() - INTERVAL '1 hour' * _hours
  GROUP BY yau.function_name
  ORDER BY total_calls DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old YouTube API usage records (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_youtube_api_usage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.youtube_api_usage 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles (drop if exists to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on YouTube API usage table (admin only)
ALTER TABLE public.youtube_api_usage ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view YouTube API usage
CREATE POLICY "Admins can view YouTube API usage" ON public.youtube_api_usage
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Function to handle new user signup with better full_name handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'User ' || SUBSTRING(NEW.id::text, 1, 8)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add profiles table to realtime publication (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- Create profiles for existing users (if any) with better full_name handling
INSERT INTO public.profiles (id, full_name, email)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.email,
    'User ' || SUBSTRING(au.id::text, 1, 8)
  ),
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Update any existing profiles with null or empty full_name
UPDATE public.profiles 
SET full_name = COALESCE(
  full_name, 
  email, 
  'User ' || SUBSTRING(id::text, 1, 8)
)
WHERE full_name IS NULL OR full_name = '';

-- Add NOT NULL constraint with default value to prevent future null values
ALTER TABLE public.profiles 
ALTER COLUMN full_name SET NOT NULL,
ALTER COLUMN full_name SET DEFAULT 'Unknown User';

-- Test query to verify the setup
SELECT 
  gm.id as message_id,
  gm.message,
  gm.user_id,
  p.full_name,
  gm.created_at,
  gm.deleted_at
FROM public.group_messages gm
LEFT JOIN public.profiles p ON gm.user_id = p.id
WHERE gm.group_name = 'Choir'
ORDER BY gm.created_at DESC
LIMIT 10; 