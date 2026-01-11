-- Migration: Create Enhanced Group Chats Tables for WhatsApp-Style Platform
-- Description: Complete schema for messaging with presence, custom groups, admins, and calls
-- Includes public.profiles to fix relation joins and secure RLS helpers

-- 1. Create or ensure profiles table exists (Essential for public joins)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add user_metadata if it was missing from an existing table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_metadata JSONB;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid "already exists" errors during re-runs
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, user_metadata)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
-- NOTE: We use upsert to add missing user_metadata if column was added later
INSERT INTO public.profiles (id, email, full_name, avatar_url, user_metadata)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'avatar_url',
    raw_user_meta_data
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    user_metadata = EXCLUDED.user_metadata;


-- 2. Drop existing group chat tables if they exist (Clean Slate)
DROP TABLE IF EXISTS call_sessions CASCADE;
DROP TABLE IF EXISTS group_admins CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS group_chats CASCADE;

-- 3. Create group_chats table
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
    created_by UUID REFERENCES public.profiles(id), -- Changed to profiles
    created_by_user UUID REFERENCES public.profiles(id), -- Changed to profiles
    UNIQUE(category)
);

-- 4. Create chat_messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed to profiles for join
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- 5. Create chat_participants table
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed to profiles
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- 6. Create user_presence table
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed to profiles
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create group_admins table
CREATE TABLE group_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed to profiles
    can_add_members BOOLEAN DEFAULT true,
    can_remove_members BOOLEAN DEFAULT true,
    can_edit_info BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- 8. Create call_sessions table
CREATE TABLE call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
    initiated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed to profiles
    call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
    status TEXT NOT NULL CHECK (status IN ('ringing', 'active', 'ended', 'missed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 9. Create indexes
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX idx_group_admins_chat_id ON group_admins(chat_id);
CREATE INDEX idx_call_sessions_chat_id ON call_sessions(chat_id);

-- 10. Enable RLS
ALTER TABLE group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

-- 11. Helper Function to Avoid RLS Recursion (CRITICAL FIX for 500 Errors)
CREATE OR REPLACE FUNCTION is_chat_member(_chat_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE chat_id = _chat_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RLS Policies

-- group_chats
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

-- chat_messages
CREATE POLICY "Users can view messages in joined chats"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        is_chat_member(chat_id) -- Uses helper to avoid recursion issues
        AND is_deleted = false
    );

CREATE POLICY "Users can send messages in joined chats"
    ON chat_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        is_chat_member(chat_id)
        AND user_id = auth.uid()
    );

-- chat_participants
-- Recursion Fix: Users can see rows if they are the user OR if they share a chat
-- But simpler: Users can see ALL participants of chats they belong to.
CREATE POLICY "Users can view participants of joined chats"
    ON chat_participants FOR SELECT
    TO authenticated
    USING (
       -- You can see a row if it belongs to a chat you are a member of
       -- But we can't query chat_participants directly here without recursion?
       -- Yes we can, because is_chat_member is SECURITY DEFINER!
       is_chat_member(chat_id)
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

-- user_presence
CREATE POLICY "Users can view presence" ON user_presence FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own presence" ON user_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own presence status" ON user_presence FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- group_admins
CREATE POLICY "Participants can view admins"
    ON group_admins FOR SELECT
    TO authenticated
    USING (is_chat_member(chat_id));

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

-- call_sessions
CREATE POLICY "Participants can view calls" ON call_sessions FOR SELECT TO authenticated USING (is_chat_member(chat_id));
CREATE POLICY "Participants can initiate calls" ON call_sessions FOR INSERT TO authenticated WITH CHECK (is_chat_member(chat_id) AND initiated_by = auth.uid());
CREATE POLICY "Initiator can update call" ON call_sessions FOR UPDATE TO authenticated USING (initiated_by = auth.uid());

-- 13. Seed initial group chats
DELETE FROM group_chats; -- Clear old
INSERT INTO group_chats (name, description, category, icon, is_custom) VALUES
    ('Main Forum', 'General church announcements and community discussions', 'main_forum', 'MessageCircle', false),
    ('Youths', 'Youth fellowship updates, events, and hangouts', 'youths', 'Users', false),
    ('Choir', 'Choir rehearsals, songs, and worship team updates', 'choir', 'Music', false),
    ('Usher', 'Ushering team schedules and coordination', 'usher', 'UserCheck', false),
    ('Evangelism', 'Outreach planning and evangelism missions', 'evangelism', 'Heart', false);

-- Helper triggers
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
