-- Enhance bible_notes table with advanced features
-- Add new columns for better note organization and functionality

-- Add new columns to bible_notes table
ALTER TABLE public.bible_notes 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_bible_notes_user_category ON public.bible_notes(user_id, category);
CREATE INDEX IF NOT EXISTS idx_bible_notes_user_favorite ON public.bible_notes(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_bible_notes_user_private ON public.bible_notes(user_id, is_private);
CREATE INDEX IF NOT EXISTS idx_bible_notes_tags ON public.bible_notes USING GIN(tags);

-- Add comments to document the new fields
COMMENT ON COLUMN public.bible_notes.title IS 'Optional title for the note';
COMMENT ON COLUMN public.bible_notes.tags IS 'Array of tags for categorizing and searching notes';
COMMENT ON COLUMN public.bible_notes.category IS 'Category of the note (insight, question, prayer, etc.)';
COMMENT ON COLUMN public.bible_notes.is_favorite IS 'Whether the note is marked as favorite';
COMMENT ON COLUMN public.bible_notes.is_private IS 'Whether the note is private (for future sharing features)';

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can create their own bible notes" ON public.bible_notes;
CREATE POLICY "Users can create their own bible notes" ON public.bible_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bible notes" ON public.bible_notes;
CREATE POLICY "Users can update their own bible notes" ON public.bible_notes
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure all existing policies are still in place
-- (The existing policies should work with the new columns)
