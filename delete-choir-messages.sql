-- ========================================
-- SAFE DELETION OF CHOIR GROUP MESSAGES
-- ========================================
-- This script safely removes all messages from the "Choir" group
-- without affecting any other functionality or breaking the app.
--
-- IMPORTANT: This script only deletes messages, NOT:
-- - Group members (group_members table)
-- - User profiles
-- - Group chat functionality
-- - Any other groups or data
--
-- The group chat will continue to work normally after deletion.
-- ========================================

-- First, let's verify what we're about to delete (PREVIEW ONLY)
-- Run this query first to see how many messages will be affected
SELECT 
    COUNT(*) as total_choir_messages,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- Preview the messages that will be deleted (first 10 for verification)
SELECT 
    id,
    user_id,
    group_name,
    LEFT(message, 50) || '...' as message_preview,
    created_at
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- ACTUAL DELETION COMMANDS
-- ========================================
-- Uncomment the section below to perform the actual deletion

/*
-- OPTION 1: SOFT DELETE (RECOMMENDED)
-- This marks messages as deleted but keeps them in database
-- This is safer and allows for recovery if needed
UPDATE public.group_messages 
SET deleted_at = NOW()
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- Verify soft deletion worked
SELECT 
    COUNT(*) as soft_deleted_messages
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NOT NULL;
*/

/*
-- OPTION 2: HARD DELETE (PERMANENT)
-- This permanently removes messages from database
-- Only use if you're absolutely sure you don't need recovery
DELETE FROM public.group_messages 
WHERE group_name = 'Choir';

-- Verify hard deletion worked
SELECT 
    COUNT(*) as remaining_choir_messages
FROM public.group_messages 
WHERE group_name = 'Choir';
*/

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after deletion to verify everything is working

-- 1. Check that other groups are unaffected
SELECT 
    group_name,
    COUNT(*) as message_count
FROM public.group_messages 
WHERE deleted_at IS NULL
GROUP BY group_name
ORDER BY group_name;

-- 2. Verify group members table is intact (if exists)
SELECT 
    group_name,
    COUNT(*) as member_count
FROM public.group_members 
GROUP BY group_name
ORDER BY group_name;

-- 3. Test that new messages can still be inserted
-- (This is just a test query - don't actually run unless testing)
/*
INSERT INTO public.group_messages (user_id, group_name, message)
VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'Choir',
    'Test message after cleanup'
);
*/

-- ========================================
-- NOTES FOR SAFETY
-- ========================================
-- 1. The group chat functionality will continue to work
-- 2. Users can still send new messages to the Choir group
-- 3. The group will appear empty but functional
-- 4. All other groups remain completely unaffected
-- 5. No user data or profiles are touched
-- 6. No foreign key constraints are violated
-- ========================================
