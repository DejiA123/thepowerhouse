-- Create service attendance table
CREATE TABLE public.service_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_date)
);

-- Add indexes for performance
CREATE INDEX idx_service_attendance_service_date ON public.service_attendance(service_date);
CREATE INDEX idx_service_attendance_user_id ON public.service_attendance(user_id);

-- Add RLS policies for service_attendance
ALTER TABLE public.service_attendance ENABLE ROW LEVEL SECURITY;

-- Users can read all attendance records (to see the count)
CREATE POLICY "Users can read all service attendance" ON public.service_attendance
  FOR SELECT USING (true);

-- Users can insert their own attendance
CREATE POLICY "Users can insert their own service attendance" ON public.service_attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own attendance
CREATE POLICY "Users can delete their own service attendance" ON public.service_attendance
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at column
CREATE TRIGGER update_service_attendance_updated_at 
  BEFORE UPDATE ON public.service_attendance 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add function to get attendance count for a specific service
CREATE OR REPLACE FUNCTION get_service_attendance_count(service_date_param DATE, service_time_param TIME)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM public.service_attendance 
    WHERE service_date = service_date_param 
    AND service_time = service_time_param
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Add function to check if user is attending a specific service
CREATE OR REPLACE FUNCTION is_user_attending_service(user_id_param UUID, service_date_param DATE, service_time_param TIME)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 
    FROM public.service_attendance 
    WHERE user_id = user_id_param 
    AND service_date = service_date_param 
    AND service_time = service_time_param
  );
END;
$$ language 'plpgsql' SECURITY DEFINER; 