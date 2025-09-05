-- Complete YouTube API Fix and Monitoring Setup
-- Run this script in your Supabase SQL Editor to ensure all functions are properly set up

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

-- Drop existing function if it exists to ensure clean recreation
DROP FUNCTION IF EXISTS public.log_youtube_api_usage(TEXT, INTEGER, INTEGER, BOOLEAN, TEXT, BOOLEAN);

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

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_youtube_api_usage_summary(INTEGER);

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

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.cleanup_youtube_api_usage();

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

-- Function to get current quota usage
CREATE OR REPLACE FUNCTION public.get_youtube_quota_status()
RETURNS TABLE (
  total_quota_used INTEGER,
  quota_percentage NUMERIC,
  status TEXT,
  last_24h_calls INTEGER,
  cache_hit_rate NUMERIC
) AS $$
DECLARE
  total_quota INTEGER;
  total_calls INTEGER;
  cache_hits INTEGER;
BEGIN
  -- Get total quota used in last 24 hours
  SELECT COALESCE(SUM(quota_units_used), 0) INTO total_quota
  FROM public.youtube_api_usage 
  WHERE created_at >= NOW() - INTERVAL '24 hours';
  
  -- Get total calls in last 24 hours
  SELECT COALESCE(COUNT(*), 0) INTO total_calls
  FROM public.youtube_api_usage 
  WHERE created_at >= NOW() - INTERVAL '24 hours';
  
  -- Get cache hits in last 24 hours
  SELECT COALESCE(COUNT(*), 0) INTO cache_hits
  FROM public.youtube_api_usage 
  WHERE created_at >= NOW() - INTERVAL '24 hours' AND cached_response = true;
  
  RETURN QUERY
  SELECT 
    total_quota,
    ROUND((total_quota::NUMERIC / 10000) * 100, 2) as quota_percentage,
    CASE 
      WHEN total_quota >= 9000 THEN 'CRITICAL'
      WHEN total_quota >= 7000 THEN 'WARNING'
      WHEN total_quota >= 5000 THEN 'MODERATE'
      ELSE 'GOOD'
    END as status,
    total_calls,
    CASE 
      WHEN total_calls > 0 THEN ROUND((cache_hits::NUMERIC / total_calls) * 100, 2)
      ELSE 0
    END as cache_hit_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old records (runs daily)
-- Note: This requires pg_cron extension which may not be available in all Supabase plans
-- You can run cleanup manually or set up a cron job

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.youtube_api_usage TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Insert initial monitoring record
INSERT INTO public.youtube_api_usage (
  function_name,
  api_calls_made,
  quota_units_used,
  success,
  cached_response,
  created_at
) VALUES (
  'setup-complete',
  0,
  0,
  true,
  true,
  NOW()
) ON CONFLICT DO NOTHING;

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW public.youtube_api_dashboard AS
SELECT 
  function_name,
  COUNT(*) as total_calls,
  SUM(quota_units_used) as total_quota,
  ROUND((COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as success_rate,
  ROUND((COUNT(*) FILTER (WHERE cached_response = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as cache_rate,
  MAX(created_at) as last_call
FROM public.youtube_api_usage
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY function_name
ORDER BY total_calls DESC;

-- Grant access to the view
GRANT SELECT ON public.youtube_api_dashboard TO anon, authenticated;

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'YouTube API monitoring setup completed successfully!';
  RAISE NOTICE 'Tables and functions created:';
  RAISE NOTICE '- youtube_api_usage (monitoring table)';
  RAISE NOTICE '- log_youtube_api_usage (logging function)';
  RAISE NOTICE '- get_youtube_api_usage_summary (summary function)';
  RAISE NOTICE '- cleanup_youtube_api_usage (cleanup function)';
  RAISE NOTICE '- get_youtube_quota_status (quota status function)';
  RAISE NOTICE '- youtube_api_dashboard (monitoring view)';
END $$; 