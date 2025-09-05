-- Add missing bio column to profiles table
-- This fixes the schema cache error where bio column was missing

-- Add bio column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'bio' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT DEFAULT 'Jesus is Lord 🙏';
    END IF;
END $$;

-- Add phone column if it doesn't exist (just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'phone' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT DEFAULT '+234 123 456 7890';
    END IF;
END $$;

-- Add avatar_url column if it doesn't exist (just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'avatar_url' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Add links column if it doesn't exist (just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' 
                   AND column_name = 'links' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.profiles ADD COLUMN links TEXT;
    END IF;
END $$;

-- Update existing profiles to have default bio if null
UPDATE public.profiles SET bio = 'Jesus is Lord 🙏' WHERE bio IS NULL;
UPDATE public.profiles SET phone = '+234 123 456 7890' WHERE phone IS NULL;
