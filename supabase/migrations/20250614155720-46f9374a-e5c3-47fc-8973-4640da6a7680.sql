
-- First, let's make sure all existing users have profiles
-- This will create profiles for any auth users that don't have them yet
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.email, 'Unknown User')
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Make sure the foreign key constraint exists between group_messages and profiles
-- Drop existing constraint if it exists and recreate it
ALTER TABLE public.group_messages
DROP CONSTRAINT IF EXISTS fk_group_messages_user_profile;

ALTER TABLE public.group_messages
ADD CONSTRAINT fk_group_messages_user_profile
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Update any existing group messages that might have user_ids not in profiles
-- This shouldn't be needed with the above INSERT, but just to be safe
UPDATE public.group_messages 
SET user_id = (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.id = group_messages.user_id
  LIMIT 1
)
WHERE user_id NOT IN (SELECT id FROM public.profiles);
