-- Migration: Add Bible Notes Folders
-- Description: Create bible_note_folders table and add folder_id to bible_notes

-- Create bible_note_folders table
CREATE TABLE IF NOT EXISTS bible_note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES bible_note_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add folder_id to bible_notes
ALTER TABLE bible_notes 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES bible_note_folders(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bible_note_folders_user_id ON bible_note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_bible_note_folders_parent_id ON bible_note_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_bible_notes_folder_id ON bible_notes(folder_id);

-- Enable RLS
ALTER TABLE bible_note_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bible_note_folders
CREATE POLICY "Users can view their own folders"
    ON bible_note_folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
    ON bible_note_folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
    ON bible_note_folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
    ON bible_note_folders FOR DELETE
    USING (auth.uid() = user_id);
