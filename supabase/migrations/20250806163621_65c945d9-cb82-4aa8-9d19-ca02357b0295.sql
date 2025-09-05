-- Create bible highlights table for verse highlighting feature
CREATE TABLE IF NOT EXISTS public.bible_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER,
  highlight_color TEXT DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;

-- Create policies for highlights
CREATE POLICY "Users can create their own highlights" 
ON public.bible_highlights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own highlights" 
ON public.bible_highlights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights" 
ON public.bible_highlights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights" 
ON public.bible_highlights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_bible_highlights_updated_at
BEFORE UPDATE ON public.bible_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();