-- Group reminders (automations): a group's admins set reminders that the app posts into
-- the group at set times, e.g. "Evangelism every Saturday at 10:00" or "Prayer meeting
-- tomorrow" the day before. A group can have up to 10.
--
-- Chats are end-to-end encrypted, so the app can't write an encrypted message for the
-- group by itself. A reminder is therefore its own card in the chat (like the choir's song
-- cards), drawn from chat_reminder_sends, never stored as a message: everyone's messages
-- stay encrypted. The reminder's words are kept on the server, like the group's name and
-- description, and the editor says so.
--
-- The cron job chat-reminders runs every minute while a reminder is due: the
-- chat-reminders function calls run_due_chat_reminders() (makes the sends) and then
-- notifies the members. Safe to run again.

create table if not exists public.chat_reminders (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  created_by uuid default auth.uid(),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  repeat text not null default 'weekly' check (repeat in ('once', 'daily', 'weekly', 'monthly')),
  -- weekly: 0 = Sunday … 6 = Saturday
  days smallint[] not null default '{}',
  -- monthly: 1–31 (a short month uses its last day)
  day_of_month smallint check (day_of_month between 1 and 31),
  -- once: the date
  on_date date,
  at_time time not null,
  time_zone text not null default 'Europe/Dublin',
  ends_on date,
  active boolean not null default true,
  next_run_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_reminders_chat_idx on public.chat_reminders (chat_id);
create index if not exists chat_reminders_due_idx on public.chat_reminders (next_run_at) where active;

create table if not exists public.chat_reminder_sends (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid references public.chat_reminders(id) on delete set null,
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  message text not null,
  sent_at timestamptz not null default now(),
  set_by uuid,
  -- when members were notified (the function notifies each send once)
  pushed_at timestamptz
);
create index if not exists chat_reminder_sends_chat_idx on public.chat_reminder_sends (chat_id, sent_at desc);
create index if not exists chat_reminder_sends_unpushed_idx on public.chat_reminder_sends (sent_at) where pushed_at is null;

-- The next time a reminder goes out after _after (null: never again)
create or replace function public.chat_reminder_next(r public.chat_reminders, _after timestamptz)
returns timestamptz
language plpgsql stable set search_path = public
as $$
declare
  d date;
  day date;
  t timestamptz;
  last_day int;
begin
  if not r.active then
    return null;
  end if;
  if r.repeat = 'once' then
    t := (r.on_date + r.at_time) at time zone r.time_zone;
    return case when t > _after then t end;
  end if;
  d := (_after at time zone r.time_zone)::date;
  for i in 0..62 loop
    day := d + i;
    if r.ends_on is not null and day > r.ends_on then
      return null;
    end if;
    last_day := extract(day from (date_trunc('month', day) + interval '1 month - 1 day'))::int;
    if r.repeat = 'daily'
       or (r.repeat = 'weekly' and extract(dow from day)::smallint = any (r.days))
       or (r.repeat = 'monthly' and extract(day from day)::int = least(r.day_of_month, last_day)) then
      t := (day + r.at_time) at time zone r.time_zone;
      if t > _after then
        return t;
      end if;
    end if;
  end loop;
  return null;
end;
$$;

-- Checks a reminder, keeps its group and setter unchanged, and works out when it goes next
-- (not security definer: it checks who is changing the reminder through current_user)
create or replace function public.chat_reminder_guard()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.message := btrim(new.message);
  if not exists (select 1 from pg_timezone_names where name = new.time_zone) then
    raise exception 'Unknown time zone %', new.time_zone using errcode = '22023';
  end if;
  if new.repeat = 'weekly' then
    if coalesce(array_length(new.days, 1), 0) = 0 or exists (select 1 from unnest(new.days) x where x < 0 or x > 6) then
      raise exception 'Pick at least one day of the week' using errcode = '22023';
    end if;
  elsif new.repeat = 'monthly' and new.day_of_month is null then
    raise exception 'Pick a day of the month' using errcode = '22023';
  elsif new.repeat = 'once' and new.on_date is null then
    raise exception 'Pick the date' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    if (select count(*) from public.chat_reminders where chat_id = new.chat_id) >= 10 then
      raise exception 'A group can have up to 10 reminders' using errcode = '22023';
    end if;
  else
    new.chat_id := old.chat_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  -- A new or changed schedule works out its next time; the sender's own update (only
  -- next_run_at / last_sent_at / active for a one-off) keeps what it set
  if tg_op = 'INSERT'
     or new.repeat is distinct from old.repeat or new.days is distinct from old.days
     or new.day_of_month is distinct from old.day_of_month or new.on_date is distinct from old.on_date
     or new.at_time is distinct from old.at_time or new.time_zone is distinct from old.time_zone
     or new.ends_on is distinct from old.ends_on or (new.active and not old.active) then
    new.next_run_at := public.chat_reminder_next(new, now());
  end if;
  if not new.active then
    new.next_run_at := null;
  end if;
  if current_user in ('authenticated', 'anon') then
    new.last_sent_at := case when tg_op = 'INSERT' then null else old.last_sent_at end;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists chat_reminder_guard on public.chat_reminders;
create trigger chat_reminder_guard
before insert or update on public.chat_reminders
for each row execute function public.chat_reminder_guard();

-- Who may see a group's reminders: its members and whoever manages it
create or replace function public.in_chat_or_manager(_chat_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.chat_participants p where p.chat_id = _chat_id and p.user_id = auth.uid())
    or public.can_manage_chat(_chat_id)
  );
$$;
revoke all on function public.in_chat_or_manager(uuid) from public, anon;
grant execute on function public.in_chat_or_manager(uuid) to authenticated;

alter table public.chat_reminders enable row level security;
alter table public.chat_reminder_sends enable row level security;

drop policy if exists "Members see the group's reminders" on public.chat_reminders;
create policy "Members see the group's reminders" on public.chat_reminders
  for select to authenticated using (public.in_chat_or_manager(chat_id));
drop policy if exists "Group admins add reminders" on public.chat_reminders;
create policy "Group admins add reminders" on public.chat_reminders
  for insert to authenticated with check (public.can_manage_chat(chat_id));
drop policy if exists "Group admins change reminders" on public.chat_reminders;
create policy "Group admins change reminders" on public.chat_reminders
  for update to authenticated using (public.can_manage_chat(chat_id)) with check (public.can_manage_chat(chat_id));
drop policy if exists "Group admins remove reminders" on public.chat_reminders;
create policy "Group admins remove reminders" on public.chat_reminders
  for delete to authenticated using (public.can_manage_chat(chat_id));

drop policy if exists "Members see the group's sent reminders" on public.chat_reminder_sends;
create policy "Members see the group's sent reminders" on public.chat_reminder_sends
  for select to authenticated using (public.in_chat_or_manager(chat_id));

grant select, insert, update, delete on public.chat_reminders to authenticated;
grant select on public.chat_reminder_sends to authenticated;
grant all on public.chat_reminders, public.chat_reminder_sends to service_role;

-- Sends every reminder that's due (one more than 30 minutes late is skipped, e.g. after an
-- outage, and just moves on to its next time). Service role only (the chat-reminders function).
create or replace function public.run_due_chat_reminders()
returns setof public.chat_reminder_sends
language plpgsql security definer set search_path = public
as $$
declare
  r public.chat_reminders;
  s public.chat_reminder_sends;
begin
  for r in
    select * from public.chat_reminders
    where active and next_run_at is not null and next_run_at <= now()
    order by next_run_at
    for update skip locked
  loop
    if r.next_run_at > now() - interval '30 minutes' then
      insert into public.chat_reminder_sends (reminder_id, chat_id, message, sent_at, set_by)
      values (r.id, r.chat_id, r.message, now(), r.created_by)
      returning * into s;
      return next s;
    end if;
    update public.chat_reminders
    set next_run_at = public.chat_reminder_next(r, now()),
        last_sent_at = case when r.next_run_at > now() - interval '30 minutes' then now() else last_sent_at end,
        active = case when r.repeat = 'once' then false else active end
    where id = r.id;
  end loop;
  return;
end;
$$;
revoke all on function public.run_due_chat_reminders() from public, anon, authenticated;
grant execute on function public.run_due_chat_reminders() to service_role;

-- "Send now" (to try a reminder): the group's admins post it into the group at once
create or replace function public.send_chat_reminder_now(_reminder_id uuid)
returns public.chat_reminder_sends
language plpgsql security definer set search_path = public
as $$
declare
  r public.chat_reminders;
  s public.chat_reminder_sends;
begin
  select * into r from public.chat_reminders where id = _reminder_id;
  if r.id is null or not public.can_manage_chat(r.chat_id) then
    raise exception 'Only the group''s admins can send its reminders' using errcode = '42501';
  end if;
  insert into public.chat_reminder_sends (reminder_id, chat_id, message, sent_at, set_by)
  values (r.id, r.chat_id, r.message, now(), auth.uid())
  returning * into s;
  return s;
end;
$$;
revoke all on function public.send_chat_reminder_now(uuid) from public, anon;
grant execute on function public.send_chat_reminder_now(uuid) to authenticated;

-- Live: a sent reminder shows in open chats at once
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_reminder_sends'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_reminder_sends';
  end if;
end;
$$;

-- Every minute while a reminder is due (or a sent one hasn't been notified yet), nudge the
-- chat-reminders function. Uses the app's public key, like send-daily-reminders.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'chat-reminders') then
    perform cron.unschedule('chat-reminders');
  end if;
  perform cron.schedule(
    'chat-reminders',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://swjzhzmhqyvwfwevijja.supabase.co/functions/v1/chat-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ'
        ),
        body := '{}'::jsonb
      )
      where exists (select 1 from public.chat_reminders where active and next_run_at <= now())
         or exists (select 1 from public.chat_reminder_sends where pushed_at is null and sent_at > now() - interval '15 minutes');
    $job$
  );
end;
$$;
