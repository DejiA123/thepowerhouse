-- Fix privacy issue: restrict profile access to protect personal information
-- Users should only see their own complete profile data

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create restrictive policy: users can only see their own profile or admins see all
CREATE POLICY "Users can view own profile or admins view all" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (
    -- Users can view their own complete profile
    auth.uid() = id 
    OR 
    -- Admins can view all profiles  
    public.is_admin(auth.uid())
  );

-- For group chat functionality, we'll need a function to get display names
-- This allows getting just the name without exposing other data
CREATE OR REPLACE FUNCTION public.get_user_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM public.profiles WHERE id = _user_id;
$$;