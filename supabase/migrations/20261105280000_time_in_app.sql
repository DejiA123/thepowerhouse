-- Time spent in the app, for church admins (Me → Admin). The app records 'time' rows
-- ({ seconds, areas: { Bible: 120, … } }): minutes on screen and in use, never what
-- anyone read or wrote. Adds to the overview: minutes today and this week, the average
-- per person this week, and where the time goes; and each member's minutes this week.
-- Safe to run again.

-- Seconds from a 'time' row, read safely: anyone can add activity rows, so anything that
-- isn't a whole number counts as 0 (never an error that breaks Admin), and one row counts
-- for at most 15 minutes (the app records every 5 minutes or when it's put away).
create or replace function public.activity_seconds(v text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case when v ~ '^[0-9]{1,9}$' then least(v::numeric, 900) else 0 end
$$;

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
    ), '[]'::json),
    'minutes_today', (
      select coalesce(round(sum(public.activity_seconds(detail ->> 'seconds')) / 60), 0)
      from app_activity
      where church_id = church and event = 'time' and created_at >= date_trunc('day', now())
    ),
    'minutes_week', (
      select coalesce(round(sum(public.activity_seconds(detail ->> 'seconds')) / 60), 0)
      from app_activity
      where church_id = church and event = 'time' and created_at >= now() - interval '7 days'
    ),
    'avg_minutes_week', (
      select coalesce(round(sum(public.activity_seconds(detail ->> 'seconds')) / 60 / nullif(count(distinct user_id), 0)), 0)
      from app_activity
      where church_id = church and event = 'time' and user_id is not null and created_at >= now() - interval '7 days'
    ),
    'time_areas', coalesce((
      select json_agg(t) from (
        select a.key as area, round(sum(public.activity_seconds(a.value)) / 60) as minutes
        from app_activity x, jsonb_each_text(case when jsonb_typeof(x.detail -> 'areas') = 'object' then x.detail -> 'areas' else '{}'::jsonb end) a
        where x.church_id = church and x.event = 'time' and x.created_at >= now() - interval '7 days'
        group by a.key
        having sum(public.activity_seconds(a.value)) >= 30
        order by sum(public.activity_seconds(a.value)) desc
        limit 8
      ) t
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;

drop function if exists public.admin_activity_members(text);
create function public.admin_activity_members(search text default null)
returns table (user_id uuid, full_name text, avatar_url text, last_at timestamptz, areas text[], minutes_week integer)
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
    (array_agg(distinct a.area) filter (where a.area is not null and a.created_at >= now() - interval '7 days'))[1:3] as areas,
    coalesce(round(sum(public.activity_seconds(a.detail ->> 'seconds')) filter (where a.event = 'time' and a.created_at >= now() - interval '7 days') / 60), 0)::integer as minutes_week
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
revoke all on function public.admin_activity_members(text) from public, anon;
grant execute on function public.admin_activity_members(text) to authenticated;
