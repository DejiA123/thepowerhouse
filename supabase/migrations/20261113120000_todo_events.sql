-- To do → "Is it working?" (Nov 2026): what actually happens with each person's tasks, so
-- the app can show honestly whether it's helping and learn from it (when you really start,
-- what stops you, how long things take you). Each person's own, append-only: a phone adds
-- rows and reads its owner's; nobody else can see them, and rows are never changed.
--   planned  {for}                 a start time was set (for null: taken off)
--   started  {planned_for}         the focus timer was started
--   focused  {minutes, initial}    a focus session ended (initial = the length it began with)
--   snoozed  {from, to}            "Not now"
--   stuck    {reason}              "What's stopping you?" (big, where, boring, perfect, tired, drop)
--   done     {due, all_day, plan, via, estimate, focus_min}
--   dropped  {how}                 let go (deleted, or kept for someday)
-- Safe to run again.

create table if not exists public.todo_events (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  todo_id uuid,
  kind text not null check (kind in ('planned', 'started', 'focused', 'snoozed', 'stuck', 'done', 'dropped')),
  at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 2048),
  created_at timestamptz not null default now()
);
create index if not exists todo_events_user_at_idx on public.todo_events (user_id, at desc);

alter table public.todo_events enable row level security;
revoke all on public.todo_events from anon, authenticated;
grant select, insert, delete on public.todo_events to authenticated;
grant all on public.todo_events to service_role;

drop policy if exists "Own events: read" on public.todo_events;
create policy "Own events: read" on public.todo_events
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Own events: add" on public.todo_events;
create policy "Own events: add" on public.todo_events
  for insert to authenticated
  with check (user_id = auth.uid() and at <= now() + interval '1 day' and at > now() - interval '30 days');
drop policy if exists "Own events: clear" on public.todo_events;
create policy "Own events: clear" on public.todo_events
  for delete to authenticated using (user_id = auth.uid());
