-- End-to-end encrypted chats (like WhatsApp) and importing a WhatsApp chat.
-- Safe to run again.

-- ── Each member's phones and browsers (public keys only) ───────────────
create table if not exists public.chat_devices (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  public_key text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists chat_devices_user_idx on public.chat_devices (user_id);
grant select, insert, update, delete on public.chat_devices to authenticated;
grant all on public.chat_devices to service_role;
alter table public.chat_devices enable row level security;

-- Public keys are meant to be public: any signed-in member can seal a chat key for them
drop policy if exists "Members see public keys" on public.chat_devices;
create policy "Members see public keys" on public.chat_devices
  for select to authenticated using (true);
drop policy if exists "Add my own device" on public.chat_devices;
create policy "Add my own device" on public.chat_devices
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Update my own device" on public.chat_devices;
create policy "Update my own device" on public.chat_devices
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Remove my own device" on public.chat_devices;
create policy "Remove my own device" on public.chat_devices
  for delete to authenticated using (user_id = auth.uid());

-- ── A chat's key, sealed for one member's device ───────────────────────
create table if not exists public.chat_keys (
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  key_id text not null,
  device_id uuid not null references public.chat_devices(id) on delete cascade,
  user_id uuid not null,
  -- Only that device can open it (sealed with a secret shared between the two devices)
  wrapped_key text not null,
  from_device_id uuid not null,
  from_public_key text not null,
  created_at timestamptz not null default now(),
  primary key (chat_id, key_id, device_id)
);
create index if not exists chat_keys_device_idx on public.chat_keys (device_id, chat_id);
grant select, insert on public.chat_keys to authenticated;
grant all on public.chat_keys to service_role;
alter table public.chat_keys enable row level security;

drop policy if exists "Members see who holds the chat keys" on public.chat_keys;
create policy "Members see who holds the chat keys" on public.chat_keys
  for select to authenticated using (user_id = auth.uid() or public.is_chat_member(chat_id));
drop policy if exists "Members share chat keys" on public.chat_keys;
create policy "Members share chat keys" on public.chat_keys
  for insert to authenticated with check (
    public.is_chat_member(chat_id)
    and exists (select 1 from public.chat_devices d where d.id = from_device_id and d.user_id = auth.uid())
    and exists (select 1 from public.chat_devices d where d.id = device_id and d.user_id = chat_keys.user_id)
    and exists (select 1 from public.chat_participants p where p.chat_id = chat_keys.chat_id and p.user_id = chat_keys.user_id)
  );

do $$
declare
  t text;
begin
  foreach t in array array['chat_devices', 'chat_keys'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
exception when undefined_object then
  null;
end $$;

-- ── Importing a WhatsApp chat ──────────────────────────────────────────
alter table public.chat_messages add column if not exists imported_from text;
alter table public.chat_messages add column if not exists imported_as uuid;

create or replace function public.chat_message_reply_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.chat_messages m where m.id = new.reply_to_id and m.chat_id = new.chat_id
  ) then
    new.reply_to_id := null;
  end if;
  if new.imported_from is null then
    new.imported_as := null;
  else
    new.imported_from := left(btrim(new.imported_from), 80);
    if new.imported_as is not null and not exists (
      select 1 from public.chat_participants p where p.chat_id = new.chat_id and p.user_id = new.imported_as
    ) then
      new.imported_as := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists chat_message_reply_check on public.chat_messages;
create trigger chat_message_reply_check
  before insert on public.chat_messages
  for each row execute function public.chat_message_reply_check();

-- Latest chat_message_guard (from 20261102180000, already applied), so the older
-- versions in these two files don't undo the 2-day delete and voice/document rules
create or replace function public.chat_message_guard()
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
  new.created_at := old.created_at;
  new.reply_to_id := old.reply_to_id;
  new.forwarded := old.forwarded;
  new.imported_from := old.imported_from;
  new.imported_as := old.imported_as;

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
    if now() - old.created_at > interval '15 minutes 30 seconds' then
      raise exception 'Messages can only be edited for 15 minutes after sending' using errcode = '42501';
    end if;
    if (old.content like '::image::%' or old.content like '::video::%')
       and split_part(new.content, E'\n', 1) <> split_part(old.content, E'\n', 1) then
      raise exception 'Only the caption of a photo or video can be edited' using errcode = '42501';
    end if;
    if btrim(new.content) = '' then
      raise exception 'A message can''t be empty' using errcode = '23514';
    end if;
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;