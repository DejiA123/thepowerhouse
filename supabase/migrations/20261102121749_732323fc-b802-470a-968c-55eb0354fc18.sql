-- Editing a message, like WhatsApp: the sender can change what a message says
-- for 15 minutes after sending it, and everyone sees "Edited" beside its time.
-- The database enforces the window (the phone's clock can't stretch it), so
-- the "Users can update their own messages" rule still decides who, and this
-- trigger decides what and when. Safe to run again.

alter table public.chat_messages add column if not exists edited_at timestamptz;

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

  -- A message stays in its chat, with its sender and its time
  new.chat_id := old.chat_id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;

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

drop trigger if exists chat_message_guard on public.chat_messages;
create trigger chat_message_guard
  before update on public.chat_messages
  for each row execute function public.chat_message_guard();