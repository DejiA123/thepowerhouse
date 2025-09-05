-- Create group_members table for group membership tracking
CREATE TABLE public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, group_name)
);

-- Enable Row Level Security
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view members of any group
CREATE POLICY "Users can view group members" ON public.group_members
  FOR SELECT USING (true);

-- RLS: Users can join a group (insert themselves)
CREATE POLICY "Users can join group" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: Users can leave a group (delete themselves)
CREATE POLICY "Users can leave group" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id); 