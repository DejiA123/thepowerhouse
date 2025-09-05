-- Fix missing foreign key constraint between group_members and profiles
-- This will allow the join to work properly and show user names instead of IDs

-- Add foreign key constraint to group_members table
ALTER TABLE public.group_members 
ADD CONSTRAINT group_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Verify the constraint was added
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='group_members';

-- Test the join to make sure it works
SELECT 
  gm.user_id,
  gm.group_name,
  p.full_name,
  p.email
FROM public.group_members gm
LEFT JOIN public.profiles p ON gm.user_id = p.id
WHERE gm.group_name = 'Choir'
LIMIT 10; 