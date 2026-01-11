-- COMPLETE DATA RESTORATION SCRIPT
-- This script adds every single task and unit detail from your project brief

-- 1. CLEAN UP TASKS (to avoid duplicates)
DELETE FROM project_tasks;

-- 2. SEED ALL TASKS FROM THE PROJECT BRIEF
INSERT INTO project_tasks (unit_name, task_text, is_immediate, deadline, description)
VALUES
-- Invitation Scripting, Design & Content Unit
('Invitation Scripting, Design & Content Unit', 'Invitations to Bishops', true, '15th Mar 2026', 'Draft and design invitations for Bishops'),
('Invitation Scripting, Design & Content Unit', 'Invitations to the Pastors all around Ireland', true, '15th Mar 2026', 'Create invitation list and content'),
('Invitation Scripting, Design & Content Unit', 'Invitations to Government functionaries (President, Governors, Mayors)', true, '15th Mar 2026', 'High-level dignitary invitations'),
('Invitation Scripting, Design & Content Unit', 'Invitations to go with flyers', true, '20th Mar 2026', 'Design invitation insert for flyers'),
('Invitation Scripting, Design & Content Unit', 'Designing of Ordination Program', true, '31st Mar 2026', 'Create program booklet design'),

-- Management & Administrative Unit
('Management & Administrative Unit', 'Printing of Flyers & Leaflets', false, '15th Mar 2026', 'Print all promotional materials'),
('Management & Administrative Unit', 'Printing of Ordination Program', false, '31st Jul 2026', 'Print program booklets'),
('Management & Administrative Unit', 'Track all unit deadlines', false, 'Ongoing', 'Monitor and follow up on all deadlines'),
('Management & Administrative Unit', 'Ensure compliance with Project Management Plan', false, 'Ongoing', 'Verify all units are on track'),

-- Pastoral Care Unit
('Pastoral Care Unit', 'Purchasing of Bishopric Robes', false, '30th Jun 2026', 'Procure all required robes'),
('Pastoral Care Unit', 'Purchasing of Bishopric Books', false, '30th Jun 2026', 'Acquire necessary ceremonial books'),
('Pastoral Care Unit', 'Selecting a designate to assist Bishop Elect with wearing of robes', false, '15th Jul 2026', 'On the day of program'),
('Pastoral Care Unit', 'Creation of Schedule for Bishop Elect from 14th - 16th August 2026', false, '31st Jul 2026', 'Detailed daily schedule'),

-- Intercessory Unit
('Intercessory Unit', 'Daily midnight prayers (12am - 1am)', true, 'Ongoing', 'Spiritual foundation and atmosphere'),
('Intercessory Unit', 'Weekly Friday vigils', true, 'Ongoing', 'Maintaining spiritual covering'),
('Intercessory Unit', 'Prayer walk at convention venue', true, '30th Jan 2026', 'Consecrating the venue'),

-- National Organising Committee
('National Organising Committee', 'Finalize budget approval', true, '30th Jan 2026', 'Submit budget for approval'),
('National Organising Committee', 'Secure convention venue deposit', true, '30th Jan 2026', 'Book and pay deposit for venue'),
('National Organising Committee', 'Draft letter to guest ministers', true, '30th Jan 2026', 'Prepare formal invitations'),

-- Usher & Protocol Unit
('Usher & Protocol Unit', 'Uniform inspection and procurement', false, '30th Jun 2026', 'Ensure all ushers have proper attire'),
('Usher & Protocol Unit', 'Protocol training for VIP handling', false, '15th Jul 2026', 'Train ushers on protocol for dignitaries'),
('Usher & Protocol Unit', 'Seating arrangement for dignitaries', false, '31st Jul 2026', 'Create seating chart for VIPs'),

-- Flights, Accommodation, Transportation & Hospitality Unit
('Flights, Accommodation, Transportation & Hospitality Unit', 'Book flights for guest ministers', true, '30th Apr 2026', 'Arrange international and domestic flights'),
('Flights, Accommodation, Transportation & Hospitality Unit', 'Arrange hotel accommodations', true, '30th Apr 2026', 'Book hotels for guests and dignitaries'),
('Flights, Accommodation, Transportation & Hospitality Unit', 'Organize ground transportation', true, '30th May 2026', 'Arrange cars and drivers'),

-- Property Acquiring Unit
('Property Acquiring Unit', 'Search and view potential properties', false, '30th May 2026', 'Identify suitable properties'),
('Property Acquiring Unit', 'Negotiate property terms', false, '30th Jun 2026', 'Discuss pricing and conditions'),
('Property Acquiring Unit', 'Finalize property acquisition', false, '31st Jul 2026', 'Complete purchase or lease agreement');

-- 3. ENSURE ALL UNIT INFORMATION IS PRESENT
INSERT INTO unit_information (unit_name, description, is_existing_unit, unit_type, full_description)
VALUES
('Children''s Department', 'Children''s ministry', true, 'Already Existing', 'Existing department managing all children''s activities'),
('National TPH Choir', 'Worship ministry', true, 'Already Existing', 'National choir providing worship leadership'),
('TPH National Pastoral Team', 'National oversight', true, 'Already Existing', 'Team providing pastoral care nationally'),
('TPH Headquarters Pastoral Team', 'HQ pastoral care', true, 'Already Existing', 'Pastoral team based at headquarters'),
('Official Flyer & Content Unit', 'Flyer creation', false, 'Immediate Action', 'Creation of the Official Flyer & Save the Date content')
ON CONFLICT (unit_name) DO NOTHING;

-- 4. UPDATE PROJECT SETTINGS
UPDATE project_settings SET total_budget = 25000 WHERE id = 'management_team';
