-- Fix critical privacy issue: restrict profile access to protect personal information
-- Users should only see basic info of others, full info of their own profile

-- Drop the overly permissive policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create policy allowing users to view only basic info (names) of other users
-- This supports group chat functionality while protecting sensitive data
CREATE POLICY "Users can view basic profile info" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (
    -- Users can always view their own complete profile
    auth.uid() = id 
    OR 
    -- Admins can view all profiles
    public.is_admin(auth.uid())
  );

-- Create a view for public profile information that excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  bio,
  avatar_url,
  created_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Create policy for the public profiles view
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.public_profiles;
CREATE POLICY "Anyone can view public profile info" ON public.public_profiles
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create a function to get basic user info for group chat functionality
CREATE OR REPLACE FUNCTION public.get_user_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = _user_id;
$$;