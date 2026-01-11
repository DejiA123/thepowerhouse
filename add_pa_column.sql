
-- Add personal_assistant column to project_guests table
ALTER TABLE project_guests ADD COLUMN IF NOT EXISTS personal_assistant text;
