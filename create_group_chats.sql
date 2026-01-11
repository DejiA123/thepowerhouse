-- Migration: Create Enhanced Group Chats Tables for WhatsApp-Style Platform
-- Description: Complete schema for messaging with presence, custom groups, admins, and calls

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS call_sessions CASCADE;
DROP TABLE IF EXISTS group_admins CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS group_chats CASCADE;

-- Create group_chats table (supports both system and custom groups)
CREATE TABLE group_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    icon TEXT DEFAULT 'MessageCircle',
    is_active BOOLEAN DEFAULT true,
    is_custom BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    created_by_user UUID REFERENCES auth.users(id),
    UNIQUE(category)
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Create chat_participants table
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(chat_id, user_id)
);

-- Create user_presence table for online status tracking
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_admins table for admin permissions
CREATE TABLE group_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_add_members BOOLEAN DEFAULT true,
    can_remove_members BOOLEAN DEFAULT true,
    can_edit_info BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Create call_sessions table for voice/video calls
CREATE TABLE call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
    status TEXT NOT NULL CHECK (status IN ('ringing', 'active', 'ended', 'missed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX idx_group_admins_chat_id ON group_admins(chat_id);
CREATE INDEX idx_call_sessions_chat_id ON call_sessions(chat_id);
CREATE INDEX idx_call_sessions_status ON call_sessions(status);

-- Enable Row Level Security
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_chats
CREATE POLICY "Anyone can view active group chats"
    ON group_chats FOR SELECT
    USING (is_active = true);

CREATE POLICY "Authenticated users can create group chats"
    ON group_chats FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by_user);

CREATE POLICY "Admins can update group info"
    ON group_chats FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_admins
            WHERE group_admins.chat_id = group_chats.id
            AND group_admins.user_id = auth.uid()
            AND group_admins.can_edit_info = true
        )
    );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in joined chats"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.chat_id = chat_messages.chat_id
            AND chat_participants.user_id = auth.uid()
        )
        AND is_deleted = false
    );

CREATE POLICY "Users can send messages in joined chats"
    ON chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.chat_id = chat_messages.chat_id
            AND chat_participants.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own messages"
    ON chat_messages FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants of joined chats"
    ON chat_participants FOR SELECT
    TO authenticated
    USING (
        chat_id IN (
            SELECT chat_id FROM chat_participants
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join active chats"
    ON chat_participants FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_chats
            WHERE id = chat_id
            AND is_active = true
        )
    );

CREATE POLICY "Users can update their own participation"
    ON chat_participants FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can remove participants"
    ON chat_participants FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_admins
            WHERE group_admins.chat_id = chat_participants.chat_id
            AND group_admins.user_id = auth.uid()
            AND group_admins.can_remove_members = true
        )
    );

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence"
    ON user_presence FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own presence"
    ON user_presence FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence status"
    ON user_presence FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policies for group_admins
CREATE POLICY "Participants can view admins"
    ON group_admins FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.chat_id = group_admins.chat_id
            AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Creator can add admins"
    ON group_admins FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_chats
            WHERE id = chat_id
            AND created_by_user = auth.uid()
        )
    );

-- RLS Policies for call_sessions
CREATE POLICY "Participants can view calls"
    ON call_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.chat_id = call_sessions.chat_id
            AND chat_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can initiate calls"
    ON call_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_participants
            WHERE chat_participants.chat_id = call_sessions.chat_id
            AND chat_participants.user_id = auth.uid()
        )
        AND initiated_by = auth.uid()
    );

CREATE POLICY "Initiator can update call"
    ON call_sessions FOR UPDATE
    TO authenticated
    USING (initiated_by = auth.uid())
    WITH CHECK (initiated_by = auth.uid());

-- Seed initial group chats (Specific requests)
INSERT INTO group_chats (name, description, category, icon, is_custom) VALUES
    ('Main Forum', 'General church announcements and community discussions', 'main_forum', 'MessageCircle', false),
    ('Youths', 'Youth fellowship updates, events, and hangouts', 'youths', 'Users', false),
    ('Choir', 'Choir rehearsals, songs, and worship team updates', 'choir', 'Music', false),
    ('Usher', 'Ushering team schedules and coordination', 'usher', 'UserCheck', false),
    ('Evangelism', 'Outreach planning and evangelism missions', 'evangelism', 'Heart', false);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
    BEFORE UPDATE ON user_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE group_chats IS 'Stores group chat information for church activities and custom groups';
COMMENT ON TABLE chat_messages IS 'Stores individual messages sent in group chats';
COMMENT ON TABLE chat_participants IS 'Tracks which users have joined which chats';
COMMENT ON TABLE user_presence IS 'Tracks online/offline status of users';
COMMENT ON TABLE group_admins IS 'Manages admin permissions for group chats';
COMMENT ON TABLE call_sessions IS 'Tracks voice and video call sessions';
