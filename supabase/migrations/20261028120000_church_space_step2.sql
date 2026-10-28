-- Church Space, Phase 2, step 2: each church only sees its own records. No visible change today.
--
-- "Your church" for a request is:
--   • the church the app asks for (header x-church-id), if you're an active member of it
--     (visitors who aren't signed in can ask for any church: they only see public things anyway);
--   • otherwise the church you joined first;
--   • visitors and server functions that don't ask: The Power House, as now.
-- Today's app never asks, and everyone is a Power House member, so nothing changes until the app does.
--
-- One extra rule, "Only this church", is laid over every church table. It is combined with the rules
-- already there (it can only narrow them, never widen), so nothing else about who can do what changes.
-- Roles (admin, pastor, choir…) now count only in the church they were given in.

-- Which church this request is for
create or replace function public.current_church_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  asked text := nullif(current_setting('request.headers', true), '')::json ->> 'x-church-id';
  uid uuid := auth.uid();
  found uuid;
begin
  if asked ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    if uid is null then
      select c.id into found from churches c where c.id = asked::uuid;
    else
      select m.church_id into found from church_members m
      where m.user_id = uid and m.church_id = asked::uuid and m.status = 'active';
    end if;
    if found is not null then
      return found;
    end if;
  end if;
  if uid is not null then
    select m.church_id into found from church_members m
    where m.user_id = uid and m.status = 'active'
    order by m.joined_at
    limit 1;
    return found; -- not in any church yet: no church records
  end if;
  return '7a1c0de5-0000-4000-8000-000000000001';
end;
$$;

grant execute on function public.current_church_id() to anon, authenticated, service_role;

-- Is this person in the church of this request? (used for seeing profiles)
create or replace function public.in_current_church(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from church_members m
    where m.user_id = _user_id and m.status = 'active' and m.church_id = public.current_church_id()
  )
$$;

grant execute on function public.in_current_church(uuid) to anon, authenticated, service_role;

-- Roles count only in the church they were given in
create or replace function public.has_role(_user_id uuid, _role church_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id
      and role = _role
      and is_active = true
      and church_id = public.current_church_id()
  )
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'administrator') or public.has_role(_user_id, 'pastor')
$$;

-- "Only this church" on every church table; new records go to this request's church
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
      continue;
    end if;
    execute format('alter table public.%I alter column church_id set default public.current_church_id()', t);
    execute format('drop policy if exists "Only this church" on public.%I', t);
    execute format(
      'create policy "Only this church" on public.%I as restrictive for all to public
         using (church_id = (select public.current_church_id()))
         with check (church_id = (select public.current_church_id()))', t);
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      raise notice 'Row security is off for %, so "Only this church" has no effect there yet', t;
    end if;
  end loop;
end $$;

-- People: you see yourself and the people in your church
drop policy if exists "Only people in this church" on public.profiles;
create policy "Only people in this church" on public.profiles as restrictive for select to public
  using (id = auth.uid() or public.in_current_church(id));

-- The admin dashboard counts only its own church
create or replace function public.admin_activity_overview()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  church uuid := public.current_church_id();
  result json;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  select json_build_object(
    'active_today', (select count(distinct user_id) from app_activity where church_id = church and user_id is not null and created_at >= date_trunc('day', now())),
    'active_week', (select count(distinct user_id) from app_activity where church_id = church and user_id is not null and created_at >= now() - interval '7 days'),
    'visitors_today', (select count(distinct session_id) from app_activity where church_id = church and user_id is null and created_at >= date_trunc('day', now())),
    'thumbs_up', (select count(*) from app_feedback where church_id = church and rating = 'up' and created_at >= now() - interval '30 days'),
    'thumbs_down', (select count(*) from app_feedback where church_id = church and rating = 'down' and created_at >= now() - interval '30 days'),
    'new_feedback', (select count(*) from app_feedback where church_id = church and status = 'new'),
    'top_areas', coalesce((
      select json_agg(t) from (
        select area, count(*) as visits
        from app_activity
        where church_id = church and event = 'page' and area is not null and created_at >= now() - interval '7 days'
        group by area order by visits desc limit 8
      ) t
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_activity_members(search text default null)
returns table (user_id uuid, full_name text, avatar_url text, last_at timestamptz, areas text[])
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  return query
  select a.user_id, p.full_name, p.avatar_url, max(a.created_at) as last_at,
    (array_agg(distinct a.area) filter (where a.area is not null and a.created_at >= now() - interval '7 days'))[1:3] as areas
  from app_activity a
  join profiles p on p.id = a.user_id
  where a.church_id = public.current_church_id()
    and a.user_id is not null
    and (search is null or search = '' or p.full_name ilike '%' || search || '%')
  group by a.user_id, p.full_name, p.avatar_url
  order by last_at desc
  limit 200;
end;
$$;

-- A hidden church for checking that churches are kept apart
insert into public.churches (id, slug, name, join_code, join_mode, profile)
values ('7a1c0de5-0000-4000-8000-0000000000fe', 'test-church', 'Test Church', 'TESTCHURCH', 'approval', '{"hidden": true}')
on conflict (id) do nothing;
