-- Notes folders get a colour (Notes → My folders), picked when making or
-- editing a folder: blue, purple, teal, green, gold, red or grey.
ALTER TABLE public.bible_note_folders
ADD COLUMN IF NOT EXISTS color TEXT;

-- Existing folders take the colours they already showed (the app cycles
-- through the list in folder order until a colour is saved)
WITH ordered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order ASC NULLS LAST, created_at ASC) AS row_num
    FROM public.bible_note_folders
)
UPDATE public.bible_note_folders
SET color = (ARRAY['blue', 'purple', 'teal', 'green', 'gold', 'red', 'grey'])[((ordered.row_num - 1) % 7) + 1]
FROM ordered
WHERE public.bible_note_folders.id = ordered.id
  AND public.bible_note_folders.color IS NULL;

COMMENT ON COLUMN public.bible_note_folders.color IS 'The folder''s colour in Notes: blue, purple, teal, green, gold, red or grey';
