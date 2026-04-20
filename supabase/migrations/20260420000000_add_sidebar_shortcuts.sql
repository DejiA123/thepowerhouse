-- Add sidebar_shortcuts column to user_preferences table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_preferences' 
                   AND column_name = 'sidebar_shortcuts' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_preferences ADD COLUMN sidebar_shortcuts JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Update existing preferences to have an empty array if null (though default should handle it)
UPDATE public.user_preferences SET sidebar_shortcuts = '[]'::jsonb WHERE sidebar_shortcuts IS NULL;
