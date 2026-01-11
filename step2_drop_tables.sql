-- STEP 2: Drop existing tables if they have issues (CAREFUL - this deletes data!)
-- Only run this if you're okay losing existing data

DROP TABLE IF EXISTS unit_information CASCADE;
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS project_tools CASCADE;
DROP TABLE IF EXISTS project_phases CASCADE;
DROP TABLE IF EXISTS project_guests CASCADE;
DROP TABLE IF EXISTS project_expenses CASCADE;
DROP TABLE IF EXISTS project_settings CASCADE;

-- After running this, proceed to STEP 3
