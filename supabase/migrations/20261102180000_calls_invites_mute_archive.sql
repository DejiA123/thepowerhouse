-- Adding people to a call (like WhatsApp), muting and archiving chats, and
-- "Delete for everyone" for 2 days. Safe to run again.

-- ── Who is in a call: members of its chat, plus anyone invited to it ────
create table if not exists public.call_invites (
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  user_id uuid not null,
  invited_by uuid not null default auth.uid(),
  status text not null default 'ringing' check (status in ('ringing', 'joined', 'declined')),
  created_at timestamptz not null default now(),
  primary key (call_id, user_id)
);
create index if not exists call_invites_user_idx on public.call_invites (user_id, created_at desc);
alter table public.call_invites enable row level security;
-- Who may touch the table at all (the rules below then decide which rows); the server
-- (send-push, ringing someone into a call) reads invites as service_role
grant select, insert, update on public.call_invites to authenticated;
grant select, insert, update, delete on public.call_invites to service_role;

-- Checked as the database (no recursion through the rules below)
create or replace function public.in_call(_call_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.call_sessions s
    where s.id = _call_id
      and (
        exists (select 1 from public.chat_participants p where p.chat_id = s.chat_id and p.user_id = auth.uid())
        or exists (select 1 from public.call_invites i where i.call_id = s.id and i.user_id = auth.uid())
      )
  );
$$;

drop policy if exists "People in the call see who's invited" on public.call_invites;
create policy "People in the call see who's invited" on public.call_invites
  for select to authenticated using (user_id = auth.uid() or public.in_call(call_id));
-- Anyone in a call that's still going can ring someone else into it
drop policy if exists "People in the call invite others" on public.call_invites;
create policy "People in the call invite others" on public.call_invites
  for insert to authenticated with check (
    invited_by = auth.uid()
    and user_id <> auth.uid()
    and public.in_call(call_id)
    and exists (
      select 1 from public.call_sessions s
      where s.id = call_id and s.status in ('ringing', 'active') and s.started_at > now() - interval '6 hours'
    )
  );
-- The person invited answers (joined / declined); someone in the call can ring them again
drop policy if exists "Invites are answered or rung again" on public.call_invites;
create policy "Invites are answered or rung again" on public.call_invites
  for update to authenticated using (user_id = auth.uid() or public.in_call(call_id))
  with check (user_id = auth.uid() or public.in_call(call_id));

-- Someone invited can see the call (to answer it from a notification)
drop policy if exists "Invited people can view the call" on public.call_sessions;
create policy "Invited people can view the call" on public.call_sessions
  for select to authenticated using (
    exists (select 1 from public.call_invites i where i.call_id = call_sessions.id and i.user_id = auth.uid())
  );

-- Invites ring straight away
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_invites'
  ) then
    alter publication supabase_realtime add table public.call_invites;
  end if;
exception when undefined_object then
  null; -- no realtime publication (local tests)
end $$;

-- ── Mute and archive (each member's own) ───────────────────────────────
alter table public.chat_participants add column if not exists muted_until timestamptz;
alter table public.chat_participants add column if not exists archived_at timestamptz;

-- Members may change their own row (read up to, mute, archive) but never move it to
-- another chat or person: that would join a chat nobody added them to
create or replace function public.chat_participant_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.chat_id := old.chat_id;
  new.user_id := old.user_id;
  new.joined_at := old.joined_at;
  return new;
end;
$$;

drop trigger if exists chat_participant_guard on public.chat_participants;
create trigger chat_participant_guard
  before update on public.chat_participants
  for each row execute function public.chat_participant_guard();

-- ── Messages: "Delete for everyone" within 2 days (like WhatsApp) ──────
create or replace function public.chat_message_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Only requests from the app (the SQL editor and server functions have no user)
  if auth.uid() is null then
    return new;
  end if;

  -- A message stays in its chat, with its sender, time, reply, forwarded mark and import
  new.chat_id := old.chat_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.reply_to_id := old.reply_to_id;
  new.forwarded := old.forwarded;
  new.imported_from := old.imported_from;
  new.imported_as := old.imported_as;

  -- Deleted for everyone: up to 2 days after sending (imported history can always be removed)
  if coalesce(new.is_deleted, false) and not coalesce(old.is_deleted, false)
     and old.imported_from is null
     and now() - old.created_at > interval '2 days 1 hour' then
    raise exception 'Messages can only be deleted for everyone within 2 days of sending' using errcode = '42501';
  end if;

  if new.content is distinct from old.content then
    if coalesce(old.is_deleted, false) or coalesce(new.is_deleted, false) then
      raise exception 'This message was deleted' using errcode = '42501';
    end if;
    if old.content like '::call::%' or new.content like '::call::%' then
      raise exception 'Calls can''t be edited' using errcode = '42501';
    end if;
    if old.content like '::voice::%' or old.content like '::file::%' then
      raise exception 'Voice messages and documents can''t be edited' using errcode = '42501';
    end if;
    -- 15 minutes, with a little grace for a slow connection
    if now() - old.created_at > interval '15 minutes 30 seconds' then
      raise exception 'Messages can only be edited for 15 minutes after sending' using errcode = '42501';
    end if;
    -- A photo or video keeps its file: only the caption changes (encrypted ones are checked on the phone)
    if (old.content like '::image::%' or old.content like '::video::%')
       and split_part(new.content, E'\n', 1) <> split_part(old.content, E'\n', 1) then
      raise exception 'Only the caption of a photo or video can be edited' using errcode = '42501';
    end if;
    if btrim(new.content) = '' then
      raise exception 'A message can''t be empty' using errcode = '23514';
    end if;
    new.edited_at := now();
  else
    -- Only an edit sets it
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;
