
-- Management Team Tools Migration

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
  first_name text not null,
  last_name text not null,
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
  name text not null,
  start_date date not null,
  end_date date not null,
  description text,
  status text default 'Upcoming', -- 'Upcoming', 'In Progress', 'Completed'
  target_met boolean default false
);

-- Seed Initial Phases
insert into project_phases (name, start_date, end_date, description, status)
values 
('Phase I', '2026-01-01', '2026-03-31', 'Planning & Formation', 'In Progress'),
('Phase II', '2026-04-01', '2026-05-31', 'Heavy Lifting & Execution', 'Upcoming'),
('Phase III', '2026-06-01', '2026-07-31', 'Final Preparations', 'Upcoming')
on conflict do nothing;

-- 4. Enable RLS
alter table project_expenses enable row level security;
alter table project_guests enable row level security;
alter table project_phases enable row level security;

-- Policies (Open for all authenticated users for now for collaboration)
create policy "Allow all read access" on project_expenses for select using (auth.role() = 'authenticated');
create policy "Allow all insert access" on project_expenses for insert with check (auth.role() = 'authenticated');
create policy "Allow all update access" on project_expenses for update using (auth.role() = 'authenticated');
create policy "Allow all delete access" on project_expenses for delete using (auth.role() = 'authenticated');

create policy "Allow all read access" on project_guests for select using (auth.role() = 'authenticated');
create policy "Allow all insert access" on project_guests for insert with check (auth.role() = 'authenticated');
create policy "Allow all update access" on project_guests for update using (auth.role() = 'authenticated');
create policy "Allow all delete access" on project_guests for delete using (auth.role() = 'authenticated');

create policy "Allow all read access" on project_phases for select using (auth.role() = 'authenticated');
create policy "Allow all insert access" on project_phases for insert with check (auth.role() = 'authenticated');
create policy "Allow all update access" on project_phases for update using (auth.role() = 'authenticated');

