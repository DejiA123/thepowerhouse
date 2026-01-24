-- Create table for Academy Modules (Teachings)
CREATE TABLE IF NOT EXISTS public.choir_academy_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- HTML or Rich Text content
    video_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('newcomer', 'core', 'leadership')),
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for Academy Quizzes
CREATE TABLE IF NOT EXISTS public.choir_academy_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.choir_academy_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for Quiz Questions
CREATE TABLE IF NOT EXISTS public.choir_academy_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.choir_academy_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings e.g. ["Option A", "Option B"]
    correct_answer_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies (Open for now based on existing app pattern, can be restricted later)
ALTER TABLE public.choir_academy_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.choir_academy_modules FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.choir_academy_modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.choir_academy_modules FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.choir_academy_modules FOR DELETE USING (true);

ALTER TABLE public.choir_academy_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.choir_academy_quizzes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.choir_academy_quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.choir_academy_quizzes FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.choir_academy_quizzes FOR DELETE USING (true);

ALTER TABLE public.choir_academy_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.choir_academy_questions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.choir_academy_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.choir_academy_questions FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.choir_academy_questions FOR DELETE USING (true);
