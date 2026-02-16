-- Add sort_order column to bible_note_folders for manual reordering
ALTER TABLE public.bible_note_folders
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing folder sort orders based on their creation date
WITH sorted_folders AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as row_num
    FROM public.bible_note_folders
)
UPDATE public.bible_note_folders
SET sort_order = sorted_folders.row_num
FROM sorted_folders
WHERE public.bible_note_folders.id = sorted_folders.id;

-- Comment for documentation
COMMENT ON COLUMN public.bible_note_folders.sort_order IS 'The manual sort order of folders for a user';
