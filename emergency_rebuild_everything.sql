-- EMERGENCY RESET AND REBUILD
-- This script will remove everything and rebuild it from scratch
-- Use this to fix the 404 errors

-- 1. DROP EVERYTHING (Clean Slate)
DROP TABLE IF EXISTS unit_information CASCADE;
DROP TABLE IF EXISTS project_tasks CASCADE;
DROP TABLE IF EXISTS project_tools CASCADE;
DROP TABLE IF EXISTS project_phases CASCADE;
DROP TABLE IF EXISTS project_guests CASCADE;
DROP TABLE IF EXISTS project_expenses CASCADE;
DROP TABLE IF EXISTS project_settings CASCADE;

-- 2. REBUILD BASE TABLES
CREATE TABLE project_settings (
    id text PRIMARY KEY,
    total_budget numeric(10, 2) DEFAULT 25000,
    overall_progress integer DEFAULT 0,
    is_manual_progress boolean DEFAULT false,
    manual_progress integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE project_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name text NOT NULL,
  category text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  date_added timestamp with time zone DEFAULT now(),
  created_by uuid
);

CREATE TABLE project_guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  role text,
  organization text,
  rsvp_status text DEFAULT 'Pending',
  assigned_seat text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE project_phases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  phase_description text,
  status text DEFAULT 'Upcoming',
  target_met boolean DEFAULT false
);

CREATE TABLE project_tools (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    url text,
    icon_name text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE project_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_name text NOT NULL,
    task_text text NOT NULL,
    is_completed boolean DEFAULT false,
    is_immediate boolean DEFAULT true,
    deadline text,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(unit_name, task_text)
);

CREATE TABLE unit_information (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_name text NOT NULL UNIQUE,
    description text,
    is_existing_unit boolean DEFAULT false,
    unit_type text,
    full_description text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. ENABLE RLS
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_information ENABLE ROW LEVEL SECURITY;

-- 4. CREATE SIMPLE POLICIES
CREATE POLICY "Public access" ON project_settings FOR ALL USING (true);
CREATE POLICY "Public access" ON project_expenses FOR ALL USING (true);
CREATE POLICY "Public access" ON project_guests FOR ALL USING (true);
CREATE POLICY "Public access" ON project_phases FOR ALL USING (true);
CREATE POLICY "Public access" ON project_tools FOR ALL USING (true);
CREATE POLICY "Public access" ON project_tasks FOR ALL USING (true);
CREATE POLICY "Public access" ON unit_information FOR ALL USING (true);

-- 5. SEED DATA
INSERT INTO project_settings (id, total_budget) VALUES ('management_team', 25000);

INSERT INTO project_phases (name, start_date, end_date, description, phase_description, status)
VALUES 
('Phase I', '2026-01-01', '2026-03-31', 'Planning & Formation', 'Heavy lifting begins - Unit formation, invitation design, venue booking, flyer creation', 'In Progress'),
('Phase II', '2026-04-01', '2026-05-31', 'Heavy Lifting & Execution', 'Heavy lifting continues - Invitations sent, logistics finalized, printing completed', 'Upcoming'),
('Phase III', '2026-06-01', '2026-07-31', 'Final Preparations', 'Final Preparations and Constant Prayers - Final checks, rehearsals, spiritual preparation', 'Upcoming');

INSERT INTO project_tools (name, description, url, icon_name, sort_order) 
VALUES 
('Budget Tracker', 'Monitor expenses', 'budget', 'CreditCard', 0),
('Guest List', 'Manage VIP RSVPs', 'guests', 'Users', 1),
('Venue Plan', 'Seating Layouts', 'brief', 'MapPin', 2);

INSERT INTO unit_information (unit_name, description, is_existing_unit, unit_type, full_description)
VALUES
('Children''s Department', 'Children''s ministry', true, 'Already Existing', 'Existing department managing all children''s activities'),
('National Organising Committee', 'Overall coordination', true, 'Already Existing', 'Main committee responsible for overall event coordination'),
('National TPH Choir', 'Worship ministry', true, 'Already Existing', 'National choir providing worship leadership'),
('TPH National Pastoral Team', 'National oversight', true, 'Already Existing', 'Team providing pastoral care nationally'),
('TPH Headquarters Pastoral Team', 'HQ pastoral care', true, 'Already Existing', 'Pastoral team based at headquarters'),
('Intercessory Unit', 'Spiritual foundation', false, 'Immediate Action', 'Formation of Intercessory Unit - Maintaining spiritual atmosphere'),
('Official Flyer & Content Unit', 'Flyer creation', false, 'Immediate Action', 'Creation of the Official Flyer & Save the Date content'),
('Invitation Scripting, Design & Content Unit', 'Invitation design', false, 'Immediate Action', 'Formation of Invitation Scripting, Design & Content Unit'),
('Flights, Accommodation, Transportation & Hospitality Unit', 'Travel coordination', false, 'Immediate Action', 'Formation of Flights, Accommodation, Transportation & Hospitality Unit'),
('Pastoral Care Unit', 'Bishop Elect care', false, 'Subsequent', 'Tasked with the procurement of all that is required for the Bishop Elect.'),
('Usher & Protocol Unit', 'VIP guest management', false, 'Subsequent', 'Tasked with the service of all incoming dignitaries.'),
('Property Acquiring Unit', 'Property search', false, 'Subsequent', 'Tasked with the search, viewing and negotiation of the new TPH property.'),
('Management & Administrative Unit', 'Project management', false, 'Subsequent', 'Tasked with ensuring all other units are compliant.');

INSERT INTO project_tasks (unit_name, task_text, is_immediate, deadline, description)
VALUES
('Intercessory Unit', 'Daily midnight prayers', true, 'Ongoing', 'Spiritual foundation'),
('National Organising Committee', 'Finalize budget approval', true, '30th Jan 2026', 'Submit budget'),
('Pastoral Care Unit', 'Purchasing of Bishopric Robes', false, '30th Jun 2026', 'Procure all required robes');
