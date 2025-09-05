-- Ensure all users have a full_name
-- Update any existing profiles with null full_name
UPDATE public.profiles 
SET full_name = COALESCE(
  full_name, 
  email, 
  'User ' || SUBSTRING(id::text, 1, 8)
)
WHERE full_name IS NULL OR full_name = '';

-- Add NOT NULL constraint with default value to prevent future null values
ALTER TABLE public.profiles 
ALTER COLUMN full_name SET NOT NULL,
ALTER COLUMN full_name SET DEFAULT 'Unknown User';

-- Update the trigger function to ensure it always sets a valid full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      'User ' || SUBSTRING(NEW.id::text, 1, 8)
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 