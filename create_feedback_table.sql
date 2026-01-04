-- Create a table for Service Feedback
CREATE TABLE IF NOT EXISTS service_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    enjoyed_most TEXT,
    want_more_of TEXT,
    didnt_work_well TEXT,
    suggestions TEXT,
    concerns TEXT,
    user_id UUID REFERENCES auth.users(id) -- Optional: to link to user if logged in
);

-- Add RLS policies (optional but recommended)
ALTER TABLE service_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (since it might be anonymous or authenticated)
CREATE POLICY "Enable insert for everyone" ON service_feedback FOR INSERT WITH CHECK (true);

-- Allow admins or specific users to read (adjust as needed)
-- For now, maybe just allow authenticated users to read their own if we link it? 
-- Or just keep it restrictive. Let's allow insert only for public/users for now.
