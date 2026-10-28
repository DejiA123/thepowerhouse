-- Church Space, Phase 2, step 1: many churches in one database, with no visible change.
create schema if not exists backup_20261028;
revoke all on schema backup_20261028 from public, anon, authenticated;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    if not exists (select 1 from pg_tables where schemaname = 'backup_20261028' and tablename = t.tablename) then
      execute format('create table backup_20261028.%I as table public.%I', t.tablename, t.tablename);
    end if;
  end loop;
end $$;

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null check (char_length(name) between 2 and 80),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{4,10}$'),
  join_mode text not null default 'open' check (join_mode in ('open', 'approval')),
  profile jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.churches (id, slug, name, join_code, join_mode)
values ('7a1c0de5-0000-4000-8000-000000000001', 'thepowerhouse', 'The Power House International', 'POWERHOUSE', 'open')
on conflict (id) do nothing;

alter table public.churches enable row level security;
revoke all on public.churches from anon, authenticated;
grant select (id, slug, name, join_mode, profile, created_at) on public.churches to anon, authenticated;
grant all on public.churches to service_role;
drop policy if exists "Anyone can find a church" on public.churches;
create policy "Anyone can find a church" on public.churches for select using (true);

create table if not exists public.church_members (
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'pending')),
  joined_at timestamptz not null default now(),
  primary key (church_id, user_id)
);
create index if not exists church_members_user_idx on public.church_members (user_id);

alter table public.church_members enable row level security;
revoke all on public.church_members from anon, authenticated;
grant select on public.church_members to authenticated;
grant all on public.church_members to service_role;
drop policy if exists "See your own memberships" on public.church_members;
create policy "See your own memberships" on public.church_members
  for select to authenticated using (user_id = auth.uid() or public.is_admin(auth.uid()));

insert into public.church_members (church_id, user_id, joined_at)
select '7a1c0de5-0000-4000-8000-000000000001', p.id, coalesce(p.created_at, now())
from public.profiles p
where exists (select 1 from auth.users u where u.id = p.id)
on conflict do nothing;

create or replace function public.join_default_church()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.church_members (church_id, user_id)
  values ('7a1c0de5-0000-4000-8000-000000000001', new.id)
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists join_default_church on public.profiles;
create trigger join_default_church after insert on public.profiles
  for each row execute function public.join_default_church();

do $$
declare
  t text;
  owned text[] := array[
    'announcements', 'app_activity', 'app_feedback',
    'choir_academy_modules', 'choir_calendar_events', 'choir_folders', 'choir_instrumental_resources',
    'choir_setlist_info', 'choir_songs', 'choir_weekly_set_songs',
    'donations', 'events', 'group_chats', 'group_members', 'group_messages', 'live_services',
    'prayer_requests', 'profile_access_log',
    'project_expenses', 'project_guests', 'project_phases', 'project_settings', 'project_tasks', 'project_tools',
    'resource_downloads', 'sermon_series', 'service_attendance', 'service_feedback',
    'songwriting_contributions', 'songwriting_song_lines', 'songwriting_themes',
    'study_guides', 'team_follow_ups', 'unit_information', 'user_roles'
  ];
begin
  foreach t in array owned loop
    if to_regclass('public.' || t) is null then
      raise notice 'Skipping %, not found', t;
      continue;
    end if;
    execute format(
      'alter table public.%I add column if not exists church_id uuid not null
         default ''7a1c0de5-0000-4000-8000-000000000001''
         references public.churches (id) on delete cascade', t);
    execute format('create index if not exists %I on public.%I (church_id)', t || '_church_idx', t);
  end loop;
end $$;