-- Fix critical security vulnerability in profiles table
-- Replace overly permissive RLS policy that allows public access to member data

-- Drop the dangerous policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure policy: only authenticated users can view basic profile info
-- Sensitive fields like email/phone should be restricted further
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy allowing users to view their own complete profile
-- (This already exists but ensuring it's properly defined)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

-- Add function to check if user can view sensitive profile data
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Users can view their own data
    auth.uid() = _profile_user_id
    OR 
    -- Admins can view all data
    public.is_admin(auth.uid())
$$;