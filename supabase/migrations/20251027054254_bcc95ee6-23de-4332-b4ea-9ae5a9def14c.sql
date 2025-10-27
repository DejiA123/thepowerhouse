-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view profile access log" ON public.profile_access_log;
DROP POLICY IF EXISTS "System can insert profile access log" ON public.profile_access_log;

-- Create audit log table for admin profile access
CREATE TABLE IF NOT EXISTS public.profile_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  access_type text NOT NULL DEFAULT 'view',
  ip_address inet,
  user_agent text
);

-- Enable RLS on audit log
ALTER TABLE public.profile_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log
CREATE POLICY "Admins can view profile access log"
ON public.profile_access_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- System can insert audit records
CREATE POLICY "System can insert profile access log"
ON public.profile_access_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id AND is_admin(auth.uid()));

-- Create function to log profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when an admin views someone else's profile
  IF is_admin(auth.uid()) AND auth.uid() != NEW.id THEN
    INSERT INTO public.profile_access_log (admin_id, profile_id, access_type)
    VALUES (auth.uid(), NEW.id, 'view');
  END IF;
  RETURN NEW;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_access_log_profile_id ON public.profile_access_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_access_log_admin_id ON public.profile_access_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_profile_access_log_accessed_at ON public.profile_access_log(accessed_at DESC);