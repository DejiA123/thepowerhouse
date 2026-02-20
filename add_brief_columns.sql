-- Migration to add project brief related columns to project_settings table
ALTER TABLE project_settings 
ADD COLUMN IF NOT EXISTS brief_title TEXT DEFAULT 'Outpouring Convention & Episcopal Consecration',
ADD COLUMN IF NOT EXISTS brief_subtitle TEXT DEFAULT 'A definitive guide to the planning, execution, and spiritual preparation for the upcoming consecration ceremony and convention.',
ADD COLUMN IF NOT EXISTS brief_overview TEXT DEFAULT 'This brief contains a high-level summary of the project management of the forthcoming Outpouring Convention & Episcopal Consecration.',
ADD COLUMN IF NOT EXISTS strategic_objective TEXT DEFAULT 'To facilitate a seamless, spiritually charged, and excellently organized event that honors the consecration of the Bishop-Elect and hosts the Outpouring Convention, ensuring maximum impact and comfort for all attendees and dignitaries.',
ADD COLUMN IF NOT EXISTS unit_formation_plan_pastor TEXT DEFAULT 'National Workers Meeting: Before this meeting, a list of all Units is given to each of the main Pastors. Pastors nominate different members and workers into groups they see fit based on skills and spiritual maturity.',
ADD COLUMN IF NOT EXISTS unit_formation_plan_meeting TEXT DEFAULT 'During the meeting, everyone is informed by their Pastor what unit they will be joining and who the unit lead will be. This ensures a blended approach and maximum collaboration across all branches.',
ADD COLUMN IF NOT EXISTS key_responsibilities JSONB DEFAULT '[{"title": "Spiritual Preparedness", "desc": "Intercessory Unit to maintain spiritual atmosphere throughout planning."}, {"title": "Excellence in Hospitality", "desc": "Usher & Protocol / Flights & Accommodations to ensure world-class treatment of guests."}, {"title": "Operational Efficiency", "desc": "NOC & Admin to handle budgets, deadlines, and compliance."}]';

-- Update the existing 'management_team' record with current values if they are NULL
UPDATE project_settings 
SET 
  brief_title = COALESCE(brief_title, 'Outpouring Convention & Episcopal Consecration'),
  brief_subtitle = COALESCE(brief_subtitle, 'A definitive guide to the planning, execution, and spiritual preparation for the upcoming consecration ceremony and convention.'),
  brief_overview = COALESCE(brief_overview, 'This brief contains a high-level summary of the project management of the forthcoming Outpouring Convention & Episcopal Consecration.'),
  strategic_objective = COALESCE(strategic_objective, 'To facilitate a seamless, spiritually charged, and excellently organized event that honors the consecration of the Bishop-Elect and hosts the Outpouring Convention, ensuring maximum impact and comfort for all attendees and dignitaries.'),
  unit_formation_plan_pastor = COALESCE(unit_formation_plan_pastor, 'National Workers Meeting: Before this meeting, a list of all Units is given to each of the main Pastors. Pastors nominate different members and workers into groups they see fit based on skills and spiritual maturity.'),
  unit_formation_plan_meeting = COALESCE(unit_formation_plan_meeting, 'During the meeting, everyone is informed by their Pastor what unit they will be joining and who the unit lead will be. This ensures a blended approach and maximum collaboration across all branches.'),
  key_responsibilities = COALESCE(key_responsibilities, '[{"title": "Spiritual Preparedness", "desc": "Intercessory Unit to maintain spiritual atmosphere throughout planning."}, {"title": "Excellence in Hospitality", "desc": "Usher & Protocol / Flights & Accommodations to ensure world-class treatment of guests."}, {"title": "Operational Efficiency", "desc": "NOC & Admin to handle budgets, deadlines, and compliance."}]'::jsonb)
WHERE id = 'management_team';
