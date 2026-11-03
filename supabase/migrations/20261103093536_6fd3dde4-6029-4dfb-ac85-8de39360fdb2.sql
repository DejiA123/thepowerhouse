-- Chats like WhatsApp: reply to a message (swipe it), forward it, star it, pin
-- it, and delete it just for yourself. Safe to run again.

-- ── Reply and forward ───────────────────────────────────────────────
alter table public.chat_messages add column if not exists reply_to_id uuid references public.chat_messages(id) on delete set null;
alter table public.chat_messages add column if not exists forwarded boolean not null default false;
create index if not exists chat_messages_reply_to_idx on public.chat_messages (reply_to_id) where reply_to_id is not null;

-- A reply points at a message in the same chat (anything else is dropped)
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
  return new;
end;
$$;

drop trigger if exists chat_message_reply_check on public.chat_messages;
create trigger chat_message_reply_check
  before insert on public.chat_messages
  for each row execute function public.chat_message_reply_check();

-- Editing (20261102090000) now also keeps what a message replies to and whether it was forwarded
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

  -- A message stays in its chat, with its sender, its time, its reply and its forwarded mark
  new.chat_id := old.chat_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.reply_to_id := old.reply_to_id;
  new.forwarded := old.forwarded;

  if new.content is distinct from old.content then
    if coalesce(old.is_deleted, false) or coalesce(new.is_deleted, false) then
      raise exception 'This message was deleted' using errcode = '42501';
    end if;
    if old.content like '::call::%' or new.content like '::call::%' then
      raise exception 'Calls can''t be edited' using errcode = '42501';
    end if;
    -- 15 minutes, with a little grace for a slow connection
    if now() - old.created_at > interval '15 minutes 30 seconds' then
      raise exception 'Messages can only be edited for 15 minutes after sending' using errcode = '42501';
    end if;
    -- A photo or video keeps its file: only the caption changes
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

-- ── Starred messages (each person's own) ────────────────────────────
create table if not exists public.chat_starred_messages (
  user_id uuid not null default auth.uid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index if not exists chat_starred_messages_chat_idx on public.chat_starred_messages (user_id, chat_id);
grant select, insert, delete on public.chat_starred_messages to authenticated;
grant all on public.chat_starred_messages to service_role;
alter table public.chat_starred_messages enable row level security;

drop policy if exists "See my starred messages" on public.chat_starred_messages;
create policy "See my starred messages" on public.chat_starred_messages
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Star messages in my chats" on public.chat_starred_messages;
create policy "Star messages in my chats" on public.chat_starred_messages
  for insert to authenticated with check (user_id = auth.uid() and public.is_chat_member(chat_id));
drop policy if exists "Unstar my messages" on public.chat_starred_messages;
create policy "Unstar my messages" on public.chat_starred_messages
  for delete to authenticated using (user_id = auth.uid());

-- ── Delete for me (hidden only from the person who deleted it) ──────
create table if not exists public.chat_hidden_messages (
  user_id uuid not null default auth.uid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index if not exists chat_hidden_messages_chat_idx on public.chat_hidden_messages (user_id, chat_id);
grant select, insert on public.chat_hidden_messages to authenticated;
grant all on public.chat_hidden_messages to service_role;
alter table public.chat_hidden_messages enable row level security;

drop policy if exists "See what I deleted for me" on public.chat_hidden_messages;
create policy "See what I deleted for me" on public.chat_hidden_messages
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Delete messages for me" on public.chat_hidden_messages;
create policy "Delete messages for me" on public.chat_hidden_messages
  for insert to authenticated with check (user_id = auth.uid() and public.is_chat_member(chat_id));

-- ── Pinned message (one per chat, any member can pin or unpin) ──────
create table if not exists public.chat_pins (
  chat_id uuid primary key references public.group_chats(id) on delete cascade,
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  pinned_by uuid not null default auth.uid(),
  pinned_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_pins to authenticated;
grant all on public.chat_pins to service_role;
alter table public.chat_pins enable row level security;

drop policy if exists "Members see the pinned message" on public.chat_pins;
create policy "Members see the pinned message" on public.chat_pins
  for select to authenticated using (public.is_chat_member(chat_id));
drop policy if exists "Members pin a message" on public.chat_pins;
create policy "Members pin a message" on public.chat_pins
  for insert to authenticated with check (
    public.is_chat_member(chat_id) and pinned_by = auth.uid()
    and exists (select 1 from public.chat_messages m where m.id = message_id and m.chat_id = chat_pins.chat_id)
  );
drop policy if exists "Members change the pinned message" on public.chat_pins;
create policy "Members change the pinned message" on public.chat_pins
  for update to authenticated using (public.is_chat_member(chat_id)) with check (
    public.is_chat_member(chat_id) and pinned_by = auth.uid()
    and exists (select 1 from public.chat_messages m where m.id = message_id and m.chat_id = chat_pins.chat_id)
  );
drop policy if exists "Members unpin" on public.chat_pins;
create policy "Members unpin" on public.chat_pins
  for delete to authenticated using (public.is_chat_member(chat_id));

-- Pins show up live for everyone in the chat
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_pins'
  ) then
    alter publication supabase_realtime add table public.chat_pins;
  end if;
exception when undefined_object then
  null; -- no realtime publication (local tests)
end $$;