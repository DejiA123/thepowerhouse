-- Create table for Team Follow Ups (replacing the Google Sheet)
CREATE TABLE IF NOT EXISTS public.team_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_name TEXT NOT NULL,
    visit_date DATE, -- Changed to allow NULL (some records have no date)
    phone_number TEXT,
    invited_by TEXT,
    assigned_to TEXT NOT NULL, -- The team member responsible
    notes TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Contacted, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Allow visit_date to be NULL (for records without dates)
ALTER TABLE public.team_follow_ups ALTER COLUMN visit_date DROP NOT NULL;

-- Enable RLS
ALTER TABLE public.team_follow_ups ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to prevent errors on re-run
DROP POLICY IF EXISTS "Allow public read access" ON public.team_follow_ups;
DROP POLICY IF EXISTS "Allow public insert access" ON public.team_follow_ups;
DROP POLICY IF EXISTS "Allow public update access" ON public.team_follow_ups;
DROP POLICY IF EXISTS "Allow public delete access" ON public.team_follow_ups;

-- create policies
CREATE POLICY "Allow public read access" ON public.team_follow_ups FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.team_follow_ups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.team_follow_ups FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.team_follow_ups FOR DELETE USING (true);

-- Clear existing data if re-running (optional, but good for clean state)
TRUNCATE public.team_follow_ups;

-- Seed real data
INSERT INTO public.team_follow_ups (visitor_name, visit_date, phone_number, invited_by, assigned_to, notes)
VALUES
('Vivian', '2025-10-05', '1 473 421 2135', 'Believers Connect ATU', 'Golden', NULL),
('Seyi', '2025-09-28', '089 244 6396', 'Presley', 'Min. Mercy', NULL),
('Reina', '2025-10-05', '085 774 0729', 'Pastor Deji', 'Min. Mercy', NULL),
('Sean', NULL, '089 419 53590', 'Benjamin', 'Pastor Deji', NULL),
('Benjamin', NULL, '083 166 4302', 'Constance', 'Pastor Deji', NULL),
('Min. Nancy', '2025-09-14', '087 492 5993', NULL, 'RP Zainab', NULL), -- AP Zainab -> RP Zainab
('Joshua', '2025-10-05', '256 782 291803', 'Pastor Deji', 'Pastor Deji', NULL),
('Zen', '2025-10-05', '083 016 0312', 'Tessie', 'Pastor Deji', NULL),
('Tolu', NULL, '0044 7503 098847', NULL, 'YP Sodiq', NULL),
('Elijah', '2025-09-14', '39 327 9299658', 'Tolu', 'Pastor Deji', NULL),
('Moses', '2025-09-14', '39 327 0665750', 'Tolu', 'Pastor Deji', NULL),
('Daniel (Nancy''s husband)', NULL, '39 351 908 9201', 'Tolu', 'Golden', NULL),
('Abare', NULL, 'Instagram', 'Constance', 'YP Sodiq', NULL),
('Keziah', NULL, '089 983 7152', 'Pastor David', 'Ibukun', NULL),
('Favour', NULL, '089 989 2433', 'Pastor David', 'Min. Mercy', NULL),
('Kosi', '2025-10-05', '083 010 4348', 'Believers Connect UoG', 'Ibukun', 'Shared assignment with Min. Mercy'),
('Hannah', '2025-10-05', '089 985 5011', 'Believers Connect UoG', 'Min. Mercy', NULL),
('Tomi', '2025-10-05', '085 144 0176', NULL, 'Min. Mercy', NULL),
('Kami', NULL, '0049 1520 6489563', 'YP Sodiq/Min. Mercy', 'Pastor Deji', NULL),
('The girl that came with Folarin', NULL, NULL, 'Folarin', 'RP Zainab', NULL),
('Samuel (Not the tall one)', NULL, '089 974 2813', 'Believers Connect ATU', 'Joel', NULL),
('Samuel', NULL, '083 021 3237', NULL, 'Joel', NULL),
('The girl that came with Paris', NULL, NULL, 'Paris', 'Ibukun', NULL),
('Tobi', '2025-10-05', '(089) 440 2342', 'Golden', 'Golden', NULL),
('Victory', '2025-09-28', '089 974 4126', 'Believers Connect UoG', 'Pastor Deji', NULL),
('Kiitan', '2025-09-21', '089 425 6729', 'Folarin', 'Min. Mercy', NULL),
('Jennifer', '2025-10-05', '083 870 8380', 'Mercy I', 'Min. Merit', NULL), -- Merit -> Min. Merit
('Maycon', '2025-10-07', '083 486 5887', 'Ovo', 'Ovo', NULL),
('Aisha', '2025-10-07', '085 725 3227', 'Ovo', 'RP Zainab', NULL), -- Zainab -> RP Zainab
('Isaac', '2025-10-26', '089 970 3806', 'Benjamin', 'Golden', NULL),
('Chantel', '2025-10-28', '0833486580', 'Min. Mercy', 'Min. Mercy', NULL);
