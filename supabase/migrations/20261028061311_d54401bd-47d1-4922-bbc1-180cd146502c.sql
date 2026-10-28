-- App feedback (Help page: thumbs up/down and a note) and a record of what
-- people do in the app, for church admins (administrators and pastors).
-- Actions only, never content: "sent a message", not what it said.

-- ── Feedback ──────────────────────────────────────────────────────────
create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  -- Empty for people who aren't signed in
  user_id uuid references auth.users(id) on delete set null,
  rating text check (rating in ('up', 'down')),
  kind text check (kind in ('problem', 'suggestion', 'other')),
  message text check (char_length(message) <= 2000),
  can_contact boolean not null default false,
  -- The page it was sent from, and the phone ("iPhone · app")
  page text check (char_length(page) <= 200),
  device text check (char_length(device) <= 60),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists app_feedback_created_idx on public.app_feedback (created_at desc);

alter table public.app_feedback enable row level security;

drop policy if exists "Anyone can send feedback" on public.app_feedback;
create policy "Anyone can send feedback" on public.app_feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read feedback" on public.app_feedback;
create policy "Admins read feedback" on public.app_feedback
  for select to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins update feedback" on public.app_feedback;
create policy "Admins update feedback" on public.app_feedback
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ── Activity ──────────────────────────────────────────────────────────
create table if not exists public.app_activity (
  id bigint generated always as identity primary key,
  -- Empty for visitors who aren't signed in (counted, never named)
  user_id uuid references auth.users(id) on delete cascade,
  -- One per time the app is opened
  session_id text not null check (char_length(session_id) <= 64),
  event text not null check (char_length(event) <= 40),
  -- The part of the app ("Bible", "Messages", "Choir"…) and the page
  area text check (char_length(area) <= 40),
  path text check (char_length(path) <= 300),
  detail jsonb check (octet_length(detail::text) <= 1000),
  device text check (char_length(device) <= 60),
  created_at timestamptz not null default now()
);

create index if not exists app_activity_user_idx on public.app_activity (user_id, created_at desc);
create index if not exists app_activity_created_idx on public.app_activity (created_at desc);

alter table public.app_activity enable row level security;

drop policy if exists "People record their own activity" on public.app_activity;
create policy "People record their own activity" on public.app_activity
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read activity" on public.app_activity;
create policy "Admins read activity" on public.app_activity
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- ── Admin summaries ───────────────────────────────────────────────────
-- Numbers for the Admin page
create or replace function public.admin_activity_overview()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  select json_build_object(
    'active_today', (select count(distinct user_id) from app_activity where user_id is not null and created_at >= date_trunc('day', now())),
    'active_week', (select count(distinct user_id) from app_activity where user_id is not null and created_at >= now() - interval '7 days'),
    'visitors_today', (select count(distinct session_id) from app_activity where user_id is null and created_at >= date_trunc('day', now())),
    'thumbs_up', (select count(*) from app_feedback where rating = 'up' and created_at >= now() - interval '30 days'),
    'thumbs_down', (select count(*) from app_feedback where rating = 'down' and created_at >= now() - interval '30 days'),
    'new_feedback', (select count(*) from app_feedback where status = 'new'),
    'top_areas', coalesce((
      select json_agg(t) from (
        select area, count(*) as visits
        from app_activity
        where event = 'page' and area is not null and created_at >= now() - interval '7 days'
        group by area order by visits desc limit 8
      ) t
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

-- Members with their last time in the app and what they used most lately
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
  where a.user_id is not null
    and (search is null or search = '' or p.full_name ilike '%' || search || '%')
  group by a.user_id, p.full_name, p.avatar_url
  order by last_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_activity_overview() from public, anon;
revoke all on function public.admin_activity_members(text) from public, anon;
grant execute on function public.admin_activity_overview() to authenticated;
grant execute on function public.admin_activity_members(text) to authenticated;

-- ── Kept for 6 months ─────────────────────────────────────────────────
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'app-activity-cleanup';
select cron.schedule(
  'app-activity-cleanup',
  '17 3 * * *',
  $$ delete from public.app_activity where created_at < now() - interval '6 months' $$
);