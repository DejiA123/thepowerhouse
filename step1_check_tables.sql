-- STEP 1: Run this first to check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('project_guests', 'project_expenses', 'project_tasks', 'unit_information');

-- If you see errors or missing tables, proceed with STEP 2
