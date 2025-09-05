-- Create user roles system for church members

-- Create enum for church roles
CREATE TYPE public.church_role AS ENUM ('choir', 'administrator', 'usher', 'pastor', 'campus_fellowship');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role church_role NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE (user_id, role)
);

-- Enable Row-Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role church_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'administrator') OR public.has_role(_user_id, 'pastor')
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can assign roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Update announcements table to allow admin management
ALTER TABLE public.announcements 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for announcements (admins can manage)
DROP POLICY IF EXISTS "insert_announcement" ON public.announcements;
DROP POLICY IF EXISTS "update_announcement" ON public.announcements;

CREATE POLICY "Admins can insert announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create live_services table for Services page live videos
CREATE TABLE public.live_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT,
  is_live BOOLEAN DEFAULT false,
  scheduled_time TIMESTAMPTZ,
  service_type TEXT NOT NULL, -- 'sunday', 'bible-study', 'prayer-meeting'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.live_services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view live services" 
ON public.live_services 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage live services" 
ON public.live_services 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_live_services_updated_at
  BEFORE UPDATE ON public.live_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();