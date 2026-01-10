-- Migration: Add Choir Calendar Events
-- Description: Create choir_calendar_events table and add RLS policies

-- Create choir_calendar_events table
CREATE TABLE IF NOT EXISTS choir_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    color TEXT DEFAULT 'purple',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_choir_calendar_events_user_id ON choir_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_choir_calendar_events_event_date ON choir_calendar_events(event_date);

-- Enable RLS
ALTER TABLE choir_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all choir events"
    ON choir_calendar_events FOR SELECT
    USING (true); -- Assuming choir events are shared, or change to auth.uid() = user_id if private

CREATE POLICY "Users can create their own choir events"
    ON choir_calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own choir events"
    ON choir_calendar_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own choir events"
    ON choir_calendar_events FOR DELETE
    USING (auth.uid() = user_id);
