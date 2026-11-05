-- Me → Admin → What's used most: what in the app gets used, for church admins only.
-- Today (since midnight where the church is), or the last 7 / 30 days. Counts and
-- names of things (a Bible chapter, a video title, a group's name), never what anyone
-- wrote. One-to-one chats are never listed. Safe to run again.

create index if not exists app_activity_church_created_idx on public.app_activity (church_id, created_at desc);

create or replace function public.admin_usage(days integer default 7, tz text default 'UTC')
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  church uuid := public.current_church_id();
  zone text := coalesce((select name from pg_timezone_names where name = tz limit 1), 'UTC');
  since timestamptz;
  result json;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  since := case
    when coalesce(days, 7) <= 1 then date_trunc('day', now() at time zone zone) at time zone zone
    else now() - make_interval(days => least(days, 90))
  end;

  with act as (
    select a.*, coalesce(a.user_id::text, 's:' || a.session_id) as who
    from app_activity a
    where a.church_id = church and a.created_at >= since
  )
  select json_build_object(
    'since', since,
    'members', (select count(distinct user_id) from act where user_id is not null),
    'visitors', (select count(distinct session_id) from act where user_id is null),
    'opens', (select count(*) from act where event = 'open'),
    'minutes', (select coalesce(round(sum(public.activity_seconds(detail ->> 'seconds')) / 60), 0) from act where event = 'time'),

    -- Each part of the app: visits, the people who opened it, and the time spent there
    'areas', coalesce((
      select json_agg(r order by r.visits desc, r.minutes desc) from (
        select coalesce(v.area, t.area) as area, coalesce(v.visits, 0) as visits, coalesce(v.people, 0) as people,
          round(coalesce(t.secs, 0) / 60) as minutes
        from (
          select area, count(*) as visits, count(distinct who) as people
          from act where event = 'page' and area is not null group by area
        ) v
        full join (
          select x.key as area, sum(public.activity_seconds(x.value)) as secs
          from act, jsonb_each_text(case when jsonb_typeof(act.detail -> 'areas') = 'object' then act.detail -> 'areas' else '{}'::jsonb end) x
          where act.event = 'time' and char_length(x.key) <= 40
          group by x.key
        ) t on t.area = v.area
        where coalesce(v.visits, 0) > 0 or coalesce(t.secs, 0) >= 30
        order by coalesce(v.visits, 0) desc, coalesce(t.secs, 0) desc
        limit 20
      ) r
    ), '[]'::json),

    -- What people did, and how many people did it
    'actions', coalesce((
      select json_agg(r order by r.times desc) from (
        select event, count(*) as times, count(distinct who) as people
        from act
        where event in ('bible_read', 'bible_listen', 'message_sent', 'prayer_posted', 'prayed', 'video_watched', 'notification_opened')
        group by event
      ) r
    ), '[]'::json),

    'chapters_read', coalesce((
      select json_agg(r) from (
        select lower(detail ->> 'book') as book, (detail ->> 'chapter')::int as chapter, count(*) as times, count(distinct who) as people
        from act
        where event = 'bible_read' and lower(detail ->> 'book') ~ '^[a-z0-9-]{1,30}$' and detail ->> 'chapter' ~ '^[0-9]{1,3}$'
        group by 1, 2 order by times desc, people desc limit 10
      ) r
    ), '[]'::json),
    'chapters_heard', coalesce((
      select json_agg(r) from (
        select lower(detail ->> 'book') as book, (detail ->> 'chapter')::int as chapter, count(*) as times, count(distinct who) as people
        from act
        where event = 'bible_listen' and lower(detail ->> 'book') ~ '^[a-z0-9-]{1,30}$' and detail ->> 'chapter' ~ '^[0-9]{1,3}$'
        group by 1, 2 order by times desc, people desc limit 10
      ) r
    ), '[]'::json),
    'books', coalesce((
      select json_agg(r) from (
        select lower(detail ->> 'book') as book, count(*) as times, count(distinct who) as people
        from act
        where event in ('bible_read', 'bible_listen') and lower(detail ->> 'book') ~ '^[a-z0-9-]{1,30}$'
        group by 1 order by times desc limit 8
      ) r
    ), '[]'::json),
    'translations', coalesce((
      select json_agg(r) from (
        select upper(detail ->> 'translation') as translation, count(*) as times, count(distinct who) as people
        from act
        where event in ('bible_read', 'bible_listen') and detail ->> 'translation' ~ '^[A-Za-z0-9-]{1,15}$'
        group by 1 order by times desc limit 6
      ) r
    ), '[]'::json),

    -- Videos: the live service counts as one, whatever that day's title
    'videos', coalesce((
      select json_agg(r) from (
        select case when detail ->> 'live' = 'true' then null else left(detail ->> 'title', 120) end as title,
          bool_or(detail ->> 'live' = 'true') as live, count(*) as times, count(distinct who) as people
        from act
        where event = 'video_watched' and (detail ->> 'live' = 'true' or coalesce(detail ->> 'title', '') <> '')
        group by 1 order by times desc limit 8
      ) r
    ), '[]'::json),

    -- Group chats only (never one-to-one), by their name today
    'chats', coalesce((
      select json_agg(r) from (
        select g.name, count(*) as messages, count(distinct act.who) as people
        from act
        join group_chats g on g.id::text = act.detail ->> 'chatId'
        where act.event = 'message_sent' and coalesce(g.description, '') <> 'Private chat' and g.church_id = church
        group by g.id, g.name order by messages desc limit 8
      ) r
    ), '[]'::json),

    'choir', coalesce((
      select json_agg(r) from (
        select split_part(split_part(path, '?', 1), '/', 4) as location, count(*) as visits, count(distinct who) as people
        from act
        where event = 'page' and path like '/groups/choir/%'
          and split_part(split_part(path, '?', 1), '/', 4) ~ '^[a-z0-9-]{1,30}$'
          and split_part(split_part(path, '?', 1), '/', 4) <> 'contributions'
        group by 1 order by visits desc limit 10
      ) r
    ), '[]'::json),

    'devices', coalesce((
      select json_agg(r) from (
        select device, count(distinct who) as people
        from act where device is not null
        group by device order by people desc limit 8
      ) r
    ), '[]'::json),

    -- When: how many people were in the app at each hour of the day (church's time),
    -- and on each day
    'hours', (
      select json_agg(coalesce(h.n, 0) order by s.hour)
      from generate_series(0, 23) as s(hour)
      left join (
        select extract(hour from created_at at time zone zone)::int as hour,
          count(distinct who || '|' || (created_at at time zone zone)::date) as n
        from act where event <> 'time'
        group by 1
      ) h on h.hour = s.hour
    ),
    'by_day', coalesce((
      select json_agg(r order by r.day) from (
        select (created_at at time zone zone)::date as day, count(distinct who) as people
        from act group by 1
      ) r
    ), '[]'::json)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_usage(integer, text) from public, anon;
grant execute on function public.admin_usage(integer, text) to authenticated;
