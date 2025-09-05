-- Create resource downloads tracking table
-- Run this script in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.resource_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_name TEXT NOT NULL,
  resource_category TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_resource_downloads_resource_name ON public.resource_downloads(resource_name);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_category ON public.resource_downloads(resource_category);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_downloaded_at ON public.resource_downloads(downloaded_at);

-- Enable Row Level Security
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resource_downloads
CREATE POLICY "Anyone can view download counts" ON public.resource_downloads
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can record downloads" ON public.resource_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to get download count for a resource
CREATE OR REPLACE FUNCTION public.get_resource_download_count(
  _resource_name TEXT,
  _resource_category TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.resource_downloads
  WHERE resource_name = _resource_name
    AND resource_category = _resource_category;
$$;

-- Function to record a download
CREATE OR REPLACE FUNCTION public.record_resource_download(
  _resource_name TEXT,
  _resource_category TEXT,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _download_id UUID;
BEGIN
  INSERT INTO public.resource_downloads (
    resource_name,
    resource_category,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    _resource_name,
    _resource_category,
    auth.uid(),
    _ip_address,
    _user_agent
  ) RETURNING id INTO _download_id;
  
  RETURN _download_id;
END;
$$; 