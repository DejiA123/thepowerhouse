-- Security fixes that keep the app working as it does today.
--
-- 1. National choir: only someone with the passcode (or a church admin) can change it.
--    The passcode used to be checked only in the app's code, where anyone could read it,
--    and the database let anyone change any choir's songs, sets and academy. Now the app
--    sends the passcode with each change (header x-choir-key) and the database checks it
--    against a hash kept here, where nobody can read it. Branch choirs (Galway and the
--    others) stay open to everyone, accounts or not, exactly as before. The Contribution
--    Tracker (National Vault) uses the same passcode.
--    Change the passcode: update choir_passcodes set passcode_hash = public.choir_passcode_hash('NEW CODE')
--      where location = 'national' and church_id = '7a1c0de5-0000-4000-8000-000000000001';
-- 2. Newcomer survey (service_feedback): anyone can still send it, no account needed;
--    only church admins can read, change or delete the answers.
-- 3. Helper functions get a fixed search_path, so they can't be tricked into running
--    look-alike code from another schema. Nothing they do changes.
--
-- The rules below are "restrictive": they only narrow what the existing rules allow.

-- ── 1. National choir passcode ─────────────────────────────────────────────

create table if not exists public.choir_passcodes (
  church_id uuid not null,
  location text not null,
  passcode_hash text not null,
  updated_at timestamptz not null default now(),
  primary key (church_id, location)
);
alter table public.choir_passcodes enable row level security;
revoke all on public.choir_passcodes from anon, authenticated;

create or replace function public.choir_passcode_hash(_passcode text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(coalesce(_passcode, ''), 'UTF8')), 'hex')
$$;

-- The Power House's National choir keeps the passcode it has today (change it as above)
insert into public.choir_passcodes (church_id, location, passcode_hash)
values ('7a1c0de5-0000-4000-8000-000000000001', 'national', public.choir_passcode_hash('090312'))
on conflict (church_id, location) do nothing;

-- Can this request change this choir? Branch choirs: anyone. National (any capitals: the
-- Contribution Tracker saves as "National"): the passcode or a church admin.
create or replace function public.choir_can_edit(_location text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sent text := nullif(current_setting('request.headers', true), '')::json ->> 'x-choir-key';
begin
  if lower(coalesce(_location, '')) <> 'national' then
    return true;
  end if;
  if public.is_admin(auth.uid()) then
    return true;
  end if;
  return sent is not null and exists (
    select 1 from choir_passcodes p
    where p.church_id = public.current_church_id()
      and p.location = 'national'
      and p.passcode_hash = public.choir_passcode_hash(sent)
  );
end;
$$;

-- The app's unlock button: is this the passcode?
create or replace function public.choir_unlock(_location text, _passcode text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from choir_passcodes p
    where p.church_id = public.current_church_id()
      and p.location = _location
      and p.passcode_hash = public.choir_passcode_hash(_passcode)
  )
$$;

revoke all on function public.choir_can_edit(text) from public;
revoke all on function public.choir_unlock(text, text) from public;
grant execute on function public.choir_can_edit(text) to anon, authenticated;
grant execute on function public.choir_unlock(text, text) to anon, authenticated;

-- Academy quizzes and questions belong to a module, which belongs to a choir
create or replace function public.choir_quiz_location(_quiz_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.location from choir_academy_quizzes q join choir_academy_modules m on m.id = q.module_id where q.id = _quiz_id
$$;

create or replace function public.choir_module_location(_module_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select location from choir_academy_modules where id = _module_id
$$;

grant execute on function public.choir_quiz_location(uuid) to anon, authenticated;
grant execute on function public.choir_module_location(uuid) to anon, authenticated;

do $$
declare
  t text;
  choir_tables text[] := array[
    'choir_songs', 'choir_folders', 'choir_weekly_set_songs', 'choir_instrumental_resources',
    'choir_setlist_info', 'choir_calendar_events', 'choir_academy_modules'
  ];
begin
  foreach t in array choir_tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop policy if exists "National choir: passcode to add" on public.%I', t);
    execute format('drop policy if exists "National choir: passcode to change" on public.%I', t);
    execute format('drop policy if exists "National choir: passcode to delete" on public.%I', t);
    execute format('create policy "National choir: passcode to add" on public.%I as restrictive for insert to public with check (public.choir_can_edit(location))', t);
    execute format('create policy "National choir: passcode to change" on public.%I as restrictive for update to public using (public.choir_can_edit(location)) with check (public.choir_can_edit(location))', t);
    execute format('create policy "National choir: passcode to delete" on public.%I as restrictive for delete to public using (public.choir_can_edit(location))', t);
  end loop;

  if to_regclass('public.choir_academy_quizzes') is not null then
    drop policy if exists "National choir: passcode to add" on public.choir_academy_quizzes;
    drop policy if exists "National choir: passcode to change" on public.choir_academy_quizzes;
    drop policy if exists "National choir: passcode to delete" on public.choir_academy_quizzes;
    create policy "National choir: passcode to add" on public.choir_academy_quizzes as restrictive for insert to public
      with check (public.choir_can_edit(public.choir_module_location(module_id)));
    create policy "National choir: passcode to change" on public.choir_academy_quizzes as restrictive for update to public
      using (public.choir_can_edit(public.choir_module_location(module_id)))
      with check (public.choir_can_edit(public.choir_module_location(module_id)));
    create policy "National choir: passcode to delete" on public.choir_academy_quizzes as restrictive for delete to public
      using (public.choir_can_edit(public.choir_module_location(module_id)));
  end if;

  if to_regclass('public.choir_academy_questions') is not null then
    drop policy if exists "National choir: passcode to add" on public.choir_academy_questions;
    drop policy if exists "National choir: passcode to change" on public.choir_academy_questions;
    drop policy if exists "National choir: passcode to delete" on public.choir_academy_questions;
    create policy "National choir: passcode to add" on public.choir_academy_questions as restrictive for insert to public
      with check (public.choir_can_edit(public.choir_quiz_location(quiz_id)));
    create policy "National choir: passcode to change" on public.choir_academy_questions as restrictive for update to public
      using (public.choir_can_edit(public.choir_quiz_location(quiz_id)))
      with check (public.choir_can_edit(public.choir_quiz_location(quiz_id)));
    create policy "National choir: passcode to delete" on public.choir_academy_questions as restrictive for delete to public
      using (public.choir_can_edit(public.choir_quiz_location(quiz_id)));
  end if;
end;
$$;

-- ── 2. Newcomer survey answers: anyone sends, church admins read ───────────

do $$
begin
  if to_regclass('public.service_feedback') is null then
    return;
  end if;
  alter table public.service_feedback enable row level security;
  drop policy if exists "Only church admins read survey answers" on public.service_feedback;
  drop policy if exists "Only church admins change survey answers" on public.service_feedback;
  drop policy if exists "Only church admins delete survey answers" on public.service_feedback;
  create policy "Only church admins read survey answers" on public.service_feedback as restrictive for select to public
    using (public.is_admin(auth.uid()));
  create policy "Only church admins change survey answers" on public.service_feedback as restrictive for update to public
    using (public.is_admin(auth.uid()));
  create policy "Only church admins delete survey answers" on public.service_feedback as restrictive for delete to public
    using (public.is_admin(auth.uid()));
end;
$$;

-- ── 3. Fixed search_path on helper functions ───────────────────────────────

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'is_chat_member', 'log_youtube_api_usage', 'handle_new_user', 'record_resource_download',
        'get_service_attendance_count', 'get_youtube_api_usage_summary', 'cleanup_youtube_api_usage',
        'get_resource_download_count', 'is_user_attending_service'
      ])
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions', f.signature);
  end loop;
end;
$$;
