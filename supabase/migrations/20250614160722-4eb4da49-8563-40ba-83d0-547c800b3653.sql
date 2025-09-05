
-- Create profiles for any users that don't have them yet
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.email, 'Unknown User')
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update any messages that might reference non-existent user profiles
-- This ensures data consistency
UPDATE public.group_messages 
SET user_id = (
  SELECT p.id 
  FROM public.profiles p 
  WHERE p.id = group_messages.user_id
  LIMIT 1
)
WHERE user_id NOT IN (SELECT id FROM public.profiles);
