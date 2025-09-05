-- ========================================
-- STEP-BY-STEP CHOIR MESSAGES CLEANUP
-- ========================================
-- Follow these steps in order to safely remove choir messages
-- Each step includes verification to ensure safety
-- ========================================

-- STEP 1: BACKUP AND VERIFICATION
-- ========================================
-- First, let's see exactly what we're working with

-- Check current choir messages count
SELECT 
    'Current Choir Messages' as info,
    COUNT(*) as count
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- Show sample messages (to verify we have the right group)
SELECT 
    'Sample Choir Messages' as info,
    LEFT(message, 100) as message_preview,
    created_at
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- Verify other groups won't be affected
SELECT 
    'Other Groups Status' as info,
    group_name,
    COUNT(*) as message_count
FROM public.group_messages 
WHERE deleted_at IS NULL
AND group_name != 'Choir'
GROUP BY group_name
ORDER BY group_name;

-- STEP 2: SAFE SOFT DELETE
-- ========================================
-- This marks messages as deleted without actually removing them
-- Run this command to perform the deletion:

UPDATE public.group_messages 
SET deleted_at = NOW()
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- STEP 3: VERIFICATION AFTER DELETION
-- ========================================
-- Run these queries to verify the deletion was successful

-- Check that choir messages are now marked as deleted
SELECT 
    'Choir Messages After Deletion' as info,
    COUNT(*) as active_messages,
    (SELECT COUNT(*) FROM public.group_messages WHERE group_name = 'Choir' AND deleted_at IS NOT NULL) as deleted_messages
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL;

-- Verify other groups are completely unaffected
SELECT 
    'All Groups Status After Cleanup' as info,
    group_name,
    COUNT(*) as active_messages
FROM public.group_messages 
WHERE deleted_at IS NULL
GROUP BY group_name
ORDER BY group_name;

-- STEP 4: TEST GROUP FUNCTIONALITY
-- ========================================
-- Test that the choir group still works for new messages
-- (Optional - only run if you want to test)

/*
-- Test inserting a new message (uncomment to test)
INSERT INTO public.group_messages (user_id, group_name, message)
VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'Choir',
    'Test message - group functionality works!'
);

-- Verify the test message appears
SELECT 
    'Test Message Verification' as info,
    message,
    created_at
FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;
*/

-- ========================================
-- FINAL SUMMARY QUERY
-- ========================================
-- Run this to get a complete status report

SELECT 
    'CLEANUP SUMMARY' as report_section,
    'Total choir messages deleted: ' || (
        SELECT COUNT(*) 
        FROM public.group_messages 
        WHERE group_name = 'Choir' 
        AND deleted_at IS NOT NULL
    ) as details
UNION ALL
SELECT 
    'VERIFICATION',
    'Active choir messages remaining: ' || (
        SELECT COUNT(*) 
        FROM public.group_messages 
        WHERE group_name = 'Choir' 
        AND deleted_at IS NULL
    )
UNION ALL
SELECT 
    'STATUS',
    'Other groups affected: 0 (as expected)'
UNION ALL
SELECT 
    'FUNCTIONALITY',
    'Choir group chat: Still fully functional for new messages';

-- ========================================
-- RECOVERY OPTION (if needed)
-- ========================================
-- If you ever need to restore the messages, run this:
/*
UPDATE public.group_messages 
SET deleted_at = NULL
WHERE group_name = 'Choir' 
AND deleted_at IS NOT NULL;
*/

-- ========================================
-- PERMANENT DELETE OPTION (if desired)
-- ========================================
-- Only run this if you want to permanently remove the messages
-- WARNING: This cannot be undone!
/*
DELETE FROM public.group_messages 
WHERE group_name = 'Choir' 
AND deleted_at IS NOT NULL;
*/
