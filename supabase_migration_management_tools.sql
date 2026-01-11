
-- Management Team Tools Migration - Complete Version
-- Includes all information from the project brief

-- 1. Project Expenses (Budget Tracker)
create table if not exists project_expenses (
  id uuid default gen_random_uuid() primary key,
  item_name text not null,
  category text not null, -- 'Venue', 'Hospitality', 'Media', 'Logistics', 'Other'
  amount numeric(10, 2) not null,
  status text not null default 'Pending', -- 'Pending', 'Paid', 'Approved'
  date_added timestamp with time zone default now(),
  created_by uuid references auth.users(id)
);

-- 2. Project Guest List
create table if not exists project_guests (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text, -- 'Bishop', 'Pastor', 'Minister', 'Guest', 'Government'
  organization text,
  rsvp_status text default 'Pending', -- 'Pending', 'Confirmed', 'Declined'
  assigned_seat text,
  notes text,
  created_at timestamp with time zone default now()
);

-- 3. Project Phases (Editable Timeline)
create table if not exists project_phases (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  start_date date not null,
  end_date date not null,
  description text,
  phase_description text, -- Additional detailed description
  status text default 'Upcoming', -- 'Upcoming', 'In Progress', 'Completed'
  target_met boolean default false
);

-- Ensure unique constraint exists for existing tables
DO $$ 
BEGIN 
    -- Remove duplicates before adding constraint
    DELETE FROM project_phases a USING project_phases b WHERE a.id < b.id AND a.name = b.name;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_phases_name_unique') THEN
        ALTER TABLE project_phases ADD CONSTRAINT project_phases_name_unique UNIQUE (name);
    END IF;
END $$;

-- Add phase_description column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_phases' AND column_name = 'phase_description') THEN
        ALTER TABLE project_phases ADD COLUMN phase_description text;
    END IF;
END $$;

-- Seed Initial Phases with complete descriptions
insert into project_phases (name, start_date, end_date, description, phase_description, status)
values 
('Phase I', '2026-01-01', '2026-03-31', 'Planning & Formation', 'Heavy lifting begins - Unit formation, invitation design, venue booking, flyer creation', 'In Progress'),
('Phase II', '2026-04-01', '2026-05-31', 'Heavy Lifting & Execution', 'Heavy lifting continues - Invitations sent, logistics finalized, printing completed', 'Upcoming'),
('Phase III', '2026-06-01', '2026-07-31', 'Final Preparations', 'Final Preparations and Constant Prayers - Final checks, rehearsals, spiritual preparation', 'Upcoming')
on conflict (name) do update set
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  description = excluded.description,
  phase_description = excluded.phase_description,
  status = excluded.status;

-- 4. Enable RLS
alter table project_expenses enable row level security;
alter table project_guests enable row level security;
alter table project_phases enable row level security;

-- Policies (Open for all authenticated users for collaboration)
-- project_expenses policies
drop policy if exists "Allow all read access" on project_expenses;
drop policy if exists "Allow all insert access" on project_expenses;
drop policy if exists "Allow all update access" on project_expenses;
drop policy if exists "Allow all delete access" on project_expenses;
create policy "Allow all read access" on project_expenses for select using (auth.role() = 'authenticated');
create policy "Allow all insert access" on project_expenses for insert with check (auth.role() = 'authenticated');
create policy "Allow all update access" on project_expenses for update using (auth.role() = 'authenticated');
create policy "Allow all delete access" on project_expenses for delete using (auth.role() = 'authenticated');

-- project_guests policies
drop policy if exists "Allow all read access" on project_guests;
drop policy if exists "Allow all insert access" on project_guests;
drop policy if exists "Allow all update access" on project_guests;
drop policy if exists "Allow all delete access" on project_guests;
create policy "Allow all read access" on project_guests for select using (auth.role() = 'authenticated');
create policy "Allow all insert access" on project_guests for insert with check (auth.role() = 'authenticated');
create policy "Allow all update access" on project_guests for update using (auth.role() = 'authenticated');
create policy "Allow all delete access" on project_guests for delete using (auth.role() = 'authenticated');

-- project_phases policies
drop policy if exists "Allow all read access" on project_phases;
drop policy if exists "Allow all insert access" on project_phases;
drop policy if exists "Allow all update access" on project_phases;
create policy "Allow all read access" on project_phases for select using (auth.role() = 'authenticated');
create policy "Allow all insert access" on project_phases for insert with check (auth.role() = 'authenticated');
create policy "Allow all update access" on project_phases for update using (auth.role() = 'authenticated');

-- 5. Project Settings (Budget, Progress)
create table if not exists project_settings (
    id text primary key, -- 'management_team'
    total_budget numeric(10, 2) default 25000,
    overall_progress integer default 0,
    is_manual_progress boolean default false,
    manual_progress integer default 0,
    updated_at timestamp with time zone default now()
);

alter table project_settings enable row level security;
drop policy if exists "Allow all access" on project_settings;
create policy "Allow all access" on project_settings for all using (auth.role() = 'authenticated');

insert into project_settings (id, total_budget) values ('management_team', 25000) on conflict (id) do nothing;

-- 6. Project Custom Tools
create table if not exists project_tools (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    description text,
    url text,
    icon_name text,
    sort_order integer default 0,
    created_at timestamp with time zone default now()
);

-- Ensure unique constraint exists for existing tables
DO $$ 
BEGIN 
    -- Remove duplicates before adding constraint
    DELETE FROM project_tools a USING project_tools b WHERE a.id < b.id AND a.name = b.name;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_tools_name_unique') THEN
        ALTER TABLE project_tools ADD CONSTRAINT project_tools_name_unique UNIQUE (name);
    END IF;
END $$;

alter table project_tools enable row level security;
drop policy if exists "Allow all access" on project_tools;
create policy "Allow all access" on project_tools for all using (auth.role() = 'authenticated');

insert into project_tools (name, description, url, icon_name, sort_order) 
values 
('Budget Tracker', 'Monitor expenses', 'budget', 'CreditCard', 0),
('Guest List', 'Manage VIP RSVPs', 'guests', 'Users', 1),
('Venue Plan', 'Seating Layouts', 'brief', 'MapPin', 2)
on conflict (name) do update set
  description = excluded.description,
  url = excluded.url,
  icon_name = excluded.icon_name,
  sort_order = excluded.sort_order;

-- 7. Project Tasks (Units) - Enhanced with description
create table if not exists project_tasks (
    id uuid default gen_random_uuid() primary key,
    unit_name text not null,
    task_text text not null,
    is_completed boolean default false,
    is_immediate boolean default true,
    deadline text,
    description text, -- New: Task description
    sort_order integer default 0,
    created_at timestamp with time zone default now(),
    unique(unit_name, task_text)
);

-- Add description column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_tasks' AND column_name = 'description') THEN
        ALTER TABLE project_tasks ADD COLUMN description text;
    END IF;
END $$;

-- Ensure unique constraint exists for existing tables
DO $$ 
BEGIN 
    -- Remove duplicates before adding constraint
    DELETE FROM project_tasks a USING project_tasks b WHERE a.id < b.id AND a.unit_name = b.unit_name AND a.task_text = b.task_text;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_tasks_unit_text_unique') THEN
        ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_unit_text_unique UNIQUE (unit_name, task_text);
    END IF;
END $$;

alter table project_tasks enable row level security;
drop policy if exists "Allow all access" on project_tasks;
create policy "Allow all access" on project_tasks for all using (auth.role() = 'authenticated');

-- Complete seed data from project brief
-- Immediate Actions
insert into project_tasks (unit_name, task_text, is_immediate, deadline, description)
values
-- Formation of Intercessory Unit
('Intercessory Unit', 'Daily midnight prayers (12am - 1am)', true, 'Ongoing', 'Spiritual foundation and atmosphere'),
('Intercessory Unit', 'Weekly Friday vigils', true, 'Ongoing', 'Maintaining spiritual covering'),
('Intercessory Unit', 'Prayer walk at convention venue', true, '30th Jan 2026', 'Consecrating the venue'),

-- National Organising Committee Meeting
('National Organising Committee', 'Finalize budget approval', true, '30th Jan 2026', 'Submit budget for approval'),
('National Organising Committee', 'Secure convention venue deposit', true, '30th Jan 2026', 'Book and pay deposit for venue'),
('National Organising Committee', 'Draft letter to guest ministers', true, '30th Jan 2026', 'Prepare formal invitations'),

-- Creation of Official Flyer & 'Save the Date' Content Creation
('Official Flyer & Content Unit', 'Design official flyer', true, '15th Feb 2026', 'Create visual design for flyer'),
('Official Flyer & Content Unit', 'Create Save the Date content', true, '15th Feb 2026', 'Draft announcement content'),
('Official Flyer & Content Unit', 'Finalize flyer for printing', true, '28th Feb 2026', 'Approve final design'),

-- Formation of Invitation Scripting, Design & Content Unit
('Invitation Scripting, Design & Content Unit', 'Invitations to Bishops', true, '15th Mar 2026', 'Draft and design invitations for Bishops'),
('Invitation Scripting, Design & Content Unit', 'Invitations to Pastors all around Ireland', true, '15th Mar 2026', 'Create invitation list and content'),
('Invitation Scripting, Design & Content Unit', 'Invitations to Government functionaries', true, '15th Mar 2026', 'President, Governors, Mayors'),
('Invitation Scripting, Design & Content Unit', 'Invitations to go with flyers', true, '20th Mar 2026', 'Design invitation insert for flyers'),
('Invitation Scripting, Design & Content Unit', 'Designing of Ordination Program', true, '31st Mar 2026', 'Create program booklet design'),

-- Formation of Flights, Accommodation, Transportation & Hospitality Unit
('Flights, Accommodation, Transportation & Hospitality Unit', 'Book flights for guest ministers', true, '30th Apr 2026', 'Arrange international and domestic flights'),
('Flights, Accommodation, Transportation & Hospitality Unit', 'Arrange hotel accommodations', true, '30th Apr 2026', 'Book hotels for guests and dignitaries'),
('Flights, Accommodation, Transportation & Hospitality Unit', 'Organize ground transportation', true, '30th May 2026', 'Arrange cars and drivers'),

-- Subsequent Units
-- Pastoral Care Unit
('Pastoral Care Unit', 'Purchasing of Bishopric Robes', false, '30th Jun 2026', 'Procure all required robes'),
('Pastoral Care Unit', 'Purchasing of Bishopric Books', false, '30th Jun 2026', 'Acquire necessary ceremonial books'),
('Pastoral Care Unit', 'Select designate to assist Bishop Elect with robes', false, '15th Jul 2026', 'Appoint and train robe assistant'),
('Pastoral Care Unit', 'Creation of Schedule for Bishop Elect (14th - 16th Aug)', false, '31st Jul 2026', 'Detailed schedule with all activities'),

-- Usher & Protocol Unit
('Usher & Protocol Unit', 'Uniform inspection and procurement', false, '30th Jun 2026', 'Ensure all ushers have proper attire'),
('Usher & Protocol Unit', 'Protocol training for VIP handling', false, '15th Jul 2026', 'Train ushers on protocol for dignitaries'),
('Usher & Protocol Unit', 'Seating arrangement for dignitaries', false, '31st Jul 2026', 'Create seating chart for VIPs'),

-- Property Acquiring Unit
('Property Acquiring Unit', 'Search and view potential properties', false, '30th May 2026', 'Identify suitable properties'),
('Property Acquiring Unit', 'Negotiate property terms', false, '30th Jun 2026', 'Discuss pricing and conditions'),
('Property Acquiring Unit', 'Finalize property acquisition', false, '31st Jul 2026', 'Complete purchase or lease agreement'),

-- Management & Administrative Unit
('Management & Administrative Unit', 'Printing of Flyers & Leaflets', false, '15th Mar 2026', 'Print all promotional materials'),
('Management & Administrative Unit', 'Printing of Ordination Program', false, '31st Jul 2026', 'Print program booklets'),
('Management & Administrative Unit', 'Track all unit deadlines', false, 'Ongoing', 'Monitor and follow up on all deadlines'),
('Management & Administrative Unit', 'Ensure compliance with Project Management Plan', false, 'Ongoing', 'Verify all units are on track')

on conflict (unit_name, task_text) do update set
  deadline = excluded.deadline,
  description = excluded.description,
  is_immediate = excluded.is_immediate;

-- 8. Unit Information Table (New)
create table if not exists unit_information (
    id uuid default gen_random_uuid() primary key,
    unit_name text not null unique,
    description text,
    is_existing_unit boolean default false, -- TRUE for already existing units
    unit_type text, -- 'Immediate Action', 'Subsequent', 'Already Existing'
    full_description text, -- Full description from brief
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table unit_information enable row level security;
drop policy if exists "Allow all access" on unit_information;
create policy "Allow all access" on unit_information for all using (auth.role() = 'authenticated');

-- Seed unit information
insert into unit_information (unit_name, description, is_existing_unit, unit_type, full_description)
values
-- Already Existing Units
('Children''s Department', 'Children''s ministry and activities', true, 'Already Existing', 'Existing department managing all children''s activities and programs'),
('National Organising Committee', 'Overall coordination and strategy', true, 'Already Existing', 'Main committee responsible for overall event coordination'),
('National TPH Choir', 'Worship and music ministry', true, 'Already Existing', 'National choir providing worship leadership'),
('TPH National Pastoral Team', 'National pastoral oversight', true, 'Already Existing', 'Team providing pastoral care and oversight nationally'),
('TPH Headquarters Pastoral Team', 'Headquarters pastoral care', true, 'Already Existing', 'Pastoral team based at headquarters'),

-- Immediate Actions
('Intercessory Unit', 'Spiritual foundation and covering', false, 'Immediate Action', 'Formation of Intercessory Unit - Maintaining spiritual atmosphere throughout planning'),
('Official Flyer & Content Unit', 'Flyer and content creation', false, 'Immediate Action', 'Creation of the Official Flyer & ''Save the Date'' Content Creation'),
('Invitation Scripting, Design & Content Unit', 'Invitation design and scripting', false, 'Immediate Action', 'Formation of Invitation Scripting, Design & Content Unit - Responsible for all invitation materials'),
('Flights, Accommodation, Transportation & Hospitality Unit', 'Travel and hospitality coordination', false, 'Immediate Action', 'Formation of Flights, Accommodation, Transportation & Hospitality Unit - Managing all travel logistics'),

-- Subsequent Units
('Pastoral Care Unit', 'Bishop Elect personal care and assistance', false, 'Subsequent', 'Tasked with the procurement of all that is required for the Bishop Elect. To serve as Personal Assistants responsible for the schedule, care, accommodation, transportation, hospitality etc. of the Bishop Elect during the program.'),
('Usher & Protocol Unit', 'VIP guest management and protocol', false, 'Subsequent', 'Tasked with the service of all incoming Bishops, Pastors, Government Officials, Incoming Music Ministers and other dignitaries present during the program.'),
('Property Acquiring Unit', 'Property search and acquisition', false, 'Subsequent', 'Tasked with the search, viewing and negotiation of the new TPH owned property ahead of the Ordination.'),
('Management & Administrative Unit', 'Project management and compliance', false, 'Subsequent', 'Tasked with the sole responsibility to ensure that all other units are compliant with the Project Management Plan, are meeting deadlines and operating efficiently. Ensuring that all Units are working together seamlessly to ensure a smooth running of the program.'),
('Ushering & Protocol', 'Guest management and order', false, 'Subsequent', 'Managing guest flow and maintaining order during the event'),
('Media & Technical', 'Audio, video and streaming', false, 'Subsequent', 'Technical support for audio, video, and live streaming')

on conflict (unit_name) do update set
  description = excluded.description,
  is_existing_unit = excluded.is_existing_unit,
  unit_type = excluded.unit_type,
  full_description = excluded.full_description;

