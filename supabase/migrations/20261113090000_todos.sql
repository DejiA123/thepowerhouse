-- To do (Nov 2026: "a to-do that beats procrastination"): each person's own tasks, with
-- tiny steps, when they'll start (a reminder rings), a deadline, how long it takes, how
-- often it's been put off, and minutes spent with the focus timer. Personal like notes,
-- so no church id: only the owner can see or change them.
--
-- Reminders, sent by the todo-reminders function (called every minute by the cron job
-- todo-reminders, only while something is due):
--   plan  - the time you said you'd start has come ("Time to start: …")
--   due   - a deadline with a time is under 2 hours away
--   brief - your morning plan, at the time you chose, when there's something for today
--   focus - the focus timer has run out (you're likely working in another app)
-- claim_todo_reminders() picks them and marks each one sent, so each rings once.
-- Safe to run again.

create table if not exists public.todos (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  notes text check (notes is null or char_length(notes) <= 4000),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 40),
  why text check (why is null or char_length(why) <= 300),
  important boolean not null default false,
  today_on date,
  plan_at timestamptz,
  due_at timestamptz,
  due_all_day boolean not null default false,
  estimate_min integer check (estimate_min is null or estimate_min between 1 and 20160),
  repeat text check (repeat is null or repeat in ('daily', 'weekdays', 'weekly', 'monthly')),
  status text not null default 'open' check (status in ('open', 'done')),
  done_at timestamptz,
  snoozes integer not null default 0 check (snoozes between 0 and 1000),
  focus_min integer not null default 0 check (focus_min between 0 and 100000),
  -- What you'll treat yourself to when it's done
  reward text check (reward is null or char_length(reward) <= 200),
  -- A friend keeping you accountable (they get a message when you commit and when it's done)
  buddy_id uuid,
  buddy_name text check (buddy_name is null or char_length(buddy_name) <= 120),
  -- The focus timer runs out then (a notification rings if the app is away)
  focus_end_at timestamptz,
  plan_notified_at timestamptz,
  due_notified_at timestamptz,
  focus_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists todos_user_idx on public.todos (user_id, status);
create index if not exists todos_plan_idx on public.todos (plan_at) where status = 'open' and plan_notified_at is null;
create index if not exists todos_focus_idx on public.todos (focus_end_at) where focus_notified_at is null and focus_end_at is not null;
create index if not exists todos_due_idx on public.todos (due_at) where status = 'open' and due_notified_at is null and not due_all_day;

alter table public.todos enable row level security;
revoke all on public.todos from anon;
grant select, insert, update, delete on public.todos to authenticated;
grant all on public.todos to service_role;
drop policy if exists "Own tasks" on public.todos;
create policy "Own tasks" on public.todos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- The reminder marks belong to the server: a person's change to a time makes its
-- reminder ring again; nothing else they send touches the marks
create or replace function public.todo_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.plan_notified_at := null;
      new.due_notified_at := null;
      new.focus_notified_at := null;
    else
      new.user_id := old.user_id;
      new.created_at := old.created_at;
      new.plan_notified_at := case when new.plan_at is distinct from old.plan_at then null else old.plan_notified_at end;
      new.due_notified_at := case when new.due_at is distinct from old.due_at then null else old.due_notified_at end;
      new.focus_notified_at := case when new.focus_end_at is distinct from old.focus_end_at then null else old.focus_notified_at end;
    end if;
  end if;
  if new.status = 'done' and new.done_at is null then
    new.done_at := now();
  elsif new.status = 'open' then
    new.done_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists todo_guard on public.todos;
create trigger todo_guard before insert or update on public.todos
  for each row execute function public.todo_guard();

-- Each person's To do settings: the morning plan and their time zone
create table if not exists public.todo_settings (
  user_id uuid primary key default auth.uid(),
  morning_brief boolean not null default true,
  brief_time time not null default '08:00' check (brief_time between '05:00' and '20:00'),
  tz text not null default 'UTC',
  last_brief_on date,
  updated_at timestamptz not null default now()
);
alter table public.todo_settings enable row level security;
revoke all on public.todo_settings from anon;
grant select, insert, update on public.todo_settings to authenticated;
grant all on public.todo_settings to service_role;
drop policy if exists "Own settings" on public.todo_settings;
create policy "Own settings" on public.todo_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A time zone the database doesn't know would break the morning plan for everyone
create or replace function public.todo_settings_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  begin
    perform now() at time zone new.tz;
  exception when others then
    new.tz := 'UTC';
  end;
  new.updated_at := now();
  if current_user in ('authenticated', 'anon') and tg_op = 'UPDATE' then
    new.last_brief_on := old.last_brief_on;
  end if;
  return new;
end;
$$;
drop trigger if exists todo_settings_guard on public.todo_settings;
create trigger todo_settings_guard before insert or update on public.todo_settings
  for each row execute function public.todo_settings_guard();

-- The first step not done yet
create or replace function public.todo_next_step(_steps jsonb)
returns text
language sql immutable
as $$
  select s->>'text'
    from jsonb_array_elements(coalesce(_steps, '[]'::jsonb)) with ordinality as e(s, n)
   where coalesce((s->>'done')::boolean, false) = false and btrim(coalesce(s->>'text', '')) <> ''
   order by n
   limit 1;
$$;

-- The day a task should be started by (the app's own sum, simpler: the estimate plus half
-- again, at 90 minutes a day; small work on the day itself)
create or replace function public.todo_start_day(_due timestamptz, _all_day boolean, _estimate integer, _tz text)
returns date
language sql stable
as $$
  select case
    when _due is null then null
    when ceil(coalesce(_estimate, 30) * 1.5) <= 60 then (_due at time zone _tz)::date
    else (_due at time zone _tz)::date - ceil(ceil(coalesce(_estimate, 30) * 1.5) / 90.0)::int
  end;
$$;

-- Pick the reminders that are due and mark each one sent (the todo-reminders function
-- sends them). Server only.
create or replace function public.claim_todo_reminders()
returns table (kind text, user_id uuid, todo_id uuid, title text, step text, at timestamptz, extra jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The time you said you'd start (a reminder more than 30 minutes late is skipped)
  return query
  with c as (
    update public.todos t
       set plan_notified_at = now()
     where t.status = 'open'
       and t.plan_notified_at is null
       and t.plan_at <= now()
       and t.plan_at > now() - interval '30 minutes'
    returning t.user_id, t.id, t.title, t.steps, t.plan_at, t.why, t.snoozes
  )
  select 'plan'::text, c.user_id, c.id, c.title, public.todo_next_step(c.steps), c.plan_at,
         jsonb_build_object('why', c.why, 'snoozes', c.snoozes)
    from c;

  -- A timed deadline under 2 hours away
  return query
  with c as (
    update public.todos t
       set due_notified_at = now()
     where t.status = 'open'
       and t.due_notified_at is null
       and not t.due_all_day
       and t.due_at > now()
       and t.due_at <= now() + interval '2 hours'
    returning t.user_id, t.id, t.title, t.steps, t.due_at
  )
  select 'due'::text, c.user_id, c.id, c.title, public.todo_next_step(c.steps), c.due_at, '{}'::jsonb
    from c;

  -- The focus timer ran out (up to 10 minutes late)
  return query
  with c as (
    update public.todos t
       set focus_notified_at = now()
     where t.status = 'open'
       and t.focus_notified_at is null
       and t.focus_end_at <= now()
       and t.focus_end_at > now() - interval '10 minutes'
    returning t.user_id, t.id, t.title, t.steps, t.focus_end_at, t.reward
  )
  select 'focus'::text, c.user_id, c.id, c.title, public.todo_next_step(c.steps), c.focus_end_at,
         jsonb_build_object('reward', c.reward)
    from c;

  -- The morning plan: once a day, from the chosen time (up to 3 hours late), only when
  -- there's something for today
  return query
  with ready as (
    update public.todo_settings s
       set last_brief_on = (now() at time zone s.tz)::date
     where s.morning_brief
       and (now() at time zone s.tz)::time >= s.brief_time
       and (now() at time zone s.tz)::time < s.brief_time + interval '3 hours'
       and s.last_brief_on is distinct from (now() at time zone s.tz)::date
    returning s.user_id, s.tz, (now() at time zone s.tz)::date as today
  ),
  todays as (
    select r.user_id, t.id, t.title, t.steps, t.important, t.due_at, t.due_all_day,
           (t.due_at is not null and (case when t.due_all_day then (t.due_at at time zone r.tz)::date < r.today else t.due_at < now() end)) as overdue
      from ready r
      join public.todos t on t.user_id = r.user_id and t.status = 'open'
     where t.today_on = r.today
        or (t.due_at is not null and (t.due_at at time zone r.tz)::date <= r.today)
        or (t.plan_at is not null and (t.plan_at at time zone r.tz)::date <= r.today)
        or public.todo_start_day(t.due_at, t.due_all_day, t.estimate_min, r.tz) <= r.today
  ),
  ranked as (
    select d.*, row_number() over (
             partition by d.user_id
             order by d.overdue desc, d.important desc, d.due_at nulls last, d.title
           ) as n,
           count(*) over (partition by d.user_id) as total,
           count(*) filter (where d.overdue) over (partition by d.user_id) as late
      from todays d
  )
  select 'brief'::text, k.user_id, k.id, k.title, public.todo_next_step(k.steps), k.due_at,
         jsonb_build_object('count', k.total, 'overdue', k.late, 'important', k.important)
    from ranked k
   where k.n = 1;
end;
$$;
revoke all on function public.claim_todo_reminders() from public, anon, authenticated;
grant execute on function public.claim_todo_reminders() to service_role;

-- Tasks changed on one phone show on the others at once
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table public.todos;
  end if;
exception when undefined_object then
  null; -- no realtime publication (local tests)
end $$;

-- Every minute while a reminder is due, nudge the todo-reminders function (the app's
-- public key, like chat-reminders)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'todo-reminders') then
    perform cron.unschedule('todo-reminders');
  end if;
  perform cron.schedule(
    'todo-reminders',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://swjzhzmhqyvwfwevijja.supabase.co/functions/v1/todo-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ'
        ),
        body := '{}'::jsonb
      )
      where exists (
              select 1 from public.todos
               where status = 'open' and plan_notified_at is null
                 and plan_at <= now() and plan_at > now() - interval '30 minutes'
            )
         or exists (
              select 1 from public.todos
               where status = 'open' and due_notified_at is null and not due_all_day
                 and due_at > now() and due_at <= now() + interval '2 hours'
            )
         or exists (
              select 1 from public.todos
               where status = 'open' and focus_notified_at is null and focus_end_at <= now()
                 and focus_end_at > now() - interval '10 minutes'
            )
         or exists (
              select 1 from public.todo_settings s
               where s.morning_brief
                 and (now() at time zone s.tz)::time >= s.brief_time
                 and (now() at time zone s.tz)::time < s.brief_time + interval '3 hours'
                 and s.last_brief_on is distinct from (now() at time zone s.tz)::date
            );
    $job$
  );
exception when invalid_schema_name or undefined_table or undefined_function then
  null; -- no pg_cron (local tests)
end $$;
