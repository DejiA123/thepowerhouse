-- Create events table for upcoming events management
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  event_type VARCHAR(50) DEFAULT 'general', -- 'general', 'youth', 'evangelism', 'campus', 'workers', 'special'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
CREATE POLICY "Anyone can view active events" 
ON public.events 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all events" 
ON public.events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrator', 'pastor') 
    AND is_active = true
  )
);

CREATE POLICY "Admins can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrator', 'pastor') 
    AND is_active = true
  )
);

CREATE POLICY "Admins can update events" 
ON public.events 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrator', 'pastor') 
    AND is_active = true
  )
);

CREATE POLICY "Admins can delete events" 
ON public.events 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('administrator', 'pastor') 
    AND is_active = true
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_events_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_is_active ON public.events(is_active);
CREATE INDEX idx_events_is_featured ON public.events(is_featured);
CREATE INDEX idx_events_event_type ON public.events(event_type);
CREATE INDEX idx_events_created_by ON public.events(created_by);

-- Insert some sample events
INSERT INTO public.events (title, description, event_date, event_time, location, event_type, priority, is_featured) VALUES
('Truly Crowned Event', 'Join us for this special celebration of God''s grace and favor', '2025-02-15', '18:00:00', 'Main Sanctuary', 'special', 'high', true),
('Gospel Jamz 2025', 'Save the date for this year''s amazing gospel music festival', '2025-06-20', '19:00:00', 'Main Sanctuary', 'special', 'high', true),
('iReturn - December', 'Our annual event where we return to give God thanks for all he has done for us throughout the year', '2025-12-31', '20:00:00', 'Main Sanctuary', 'special', 'high', true); 