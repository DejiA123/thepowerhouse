-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for Bible notes
CREATE TABLE public.bible_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for group chat messages
CREATE TABLE public.group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  message TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Remove the incorrect foreign key constraint
ALTER TABLE public.group_messages
DROP CONSTRAINT IF EXISTS fk_profile;

-- Add a proper foreign key constraint to auth.users (this is already correct)
-- The user_id should reference auth.users(id), not profiles(id)

-- Test query to verify the relationship (explicitly qualify created_at to avoid ambiguity)
SELECT group_messages.*, profiles.full_name
FROM group_messages
JOIN profiles ON group_messages.user_id = profiles.id
WHERE group_messages.group_name = 'Choir'
ORDER BY group_messages.created_at ASC
LIMIT 50;

-- Create table for user app preferences
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notifications_enabled BOOLEAN DEFAULT true,
  audio_quality TEXT DEFAULT 'high',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create table for announcements
CREATE TABLE public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create table for reading plan progress
CREATE TABLE public.reading_plan_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT NOT NULL,
  current_day INTEGER DEFAULT 1,
  completed_days TEXT[] DEFAULT '{}',
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- Create table for prayer requests
CREATE TABLE public.prayer_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for sermon series
CREATE TABLE public.sermon_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  audio_url TEXT,
  download_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for study guides
CREATE TABLE public.study_guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bible_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_guides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for bible_notes
CREATE POLICY "Users can view their own bible notes" ON public.bible_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bible notes" ON public.bible_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bible notes" ON public.bible_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bible notes" ON public.bible_notes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for group_messages
CREATE POLICY "Users can view group messages" ON public.group_messages
  FOR SELECT USING (true);
CREATE POLICY "Users can create group messages" ON public.group_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for announcements
CREATE POLICY "Everyone can view active announcements" ON public.announcements
  FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can create announcements" ON public.announcements
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- RLS Policies for reading_plan_progress
CREATE POLICY "Users can view their own reading progress" ON public.reading_plan_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own reading progress" ON public.reading_plan_progress
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for prayer_requests
CREATE POLICY "Users can view their own prayer requests" ON public.prayer_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own prayer requests" ON public.prayer_requests
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for sermon_series and study_guides (public read)
CREATE POLICY "Everyone can view sermon series" ON public.sermon_series
  FOR SELECT USING (true);
CREATE POLICY "Everyone can view study guides" ON public.study_guides
  FOR SELECT USING (true);

-- Enable realtime for announcements and group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
