-- Update bible_notes table to support advanced note features
-- Add missing columns that the BibleNotesDialog component expects

ALTER TABLE public.bible_notes 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Update existing notes to have default values for new columns
UPDATE public.bible_notes 
SET 
  title = COALESCE(title, ''),
  category = COALESCE(category, ''),
  tags = COALESCE(tags, '{}'),
  is_favorite = COALESCE(is_favorite, false),
  is_private = COALESCE(is_private, false)
WHERE title IS NULL OR category IS NULL OR tags IS NULL OR is_favorite IS NULL OR is_private IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bible_notes_user_book_chapter ON public.bible_notes(user_id, book, chapter);
CREATE INDEX IF NOT EXISTS idx_bible_notes_category ON public.bible_notes(category);
CREATE INDEX IF NOT EXISTS idx_bible_notes_favorite ON public.bible_notes(is_favorite);
CREATE INDEX IF NOT EXISTS idx_bible_notes_created_at ON public.bible_notes(created_at);

-- Update RLS policies to ensure they work with new columns
DROP POLICY IF EXISTS "Users can view their own bible notes" ON public.bible_notes;
DROP POLICY IF EXISTS "Users can create their own bible notes" ON public.bible_notes;
DROP POLICY IF EXISTS "Users can update their own bible notes" ON public.bible_notes;
DROP POLICY IF EXISTS "Users can delete their own bible notes" ON public.bible_notes;

-- Recreate RLS policies
CREATE POLICY "Users can view their own bible notes" ON public.bible_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bible notes" ON public.bible_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bible notes" ON public.bible_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bible notes" ON public.bible_notes
  FOR DELETE USING (auth.uid() = user_id);
