-- ========================================
-- QUICK CHOIR MESSAGES CLEANUP
-- ========================================
-- This script safely removes all choir messages in one command
-- Safe: Uses soft delete (can be recovered if needed)
-- Fast: Single command execution
-- Tested: Preserves all functionality
-- ========================================

-- BEFORE: Check what we're about to clean up
SELECT 
    COUNT(*) as "Messages to be deleted"
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- EXECUTE: Safe deletion of choir messages
UPDATE public.group_messages 
SET deleted_at = NOW()
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- AFTER: Verify cleanup was successful
SELECT 
    'Choir messages deleted: ' || COUNT(*) as "Cleanup Result"
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NOT NULL;

-- VERIFY: Other groups are unaffected
SELECT 
    group_name as "Remaining Groups",
    COUNT(*) as "Active Messages"
FROM public.group_messages 
WHERE deleted_at IS NULL
GROUP BY group_name
ORDER BY group_name;

-- ✅ DONE! 
-- The choir group is now clean but fully functional
-- Users can still send new messages to the choir group
-- All other groups are completely unaffected
-- The app functionality remains intact
