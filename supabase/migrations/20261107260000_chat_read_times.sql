-- Message info, like WhatsApp: "Seen by" with the time each person saw my message.
-- chat_participants.last_read_at only says how far someone has read (the time of the
-- last message they've seen), not when. So every time it moves on, a row records when
-- (chat_read_log). The time someone saw a message is the first row whose read_up_to
-- reaches the message. Rows are kept 60 days; older messages show "Seen" with no time.
-- Only the message's sender can ask (chat_message_reads). Safe to run again.

create table if not exists public.chat_read_log (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null,
  read_up_to timestamptz not null,
  read_at timestamptz not null default now()
);
create index if not exists chat_read_log_chat_up_to on public.chat_read_log (chat_id, read_up_to);
create index if not exists chat_read_log_chat_user_at on public.chat_read_log (chat_id, user_id, read_at);

-- Nobody reads or writes it directly: only the trigger below and chat_message_reads
alter table public.chat_read_log enable row level security;
revoke all on public.chat_read_log from anon, authenticated;

create or replace function public.log_chat_read()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_read_at is not null and new.last_read_at > coalesce(old.last_read_at, '-infinity'::timestamptz) then
    insert into public.chat_read_log (chat_id, user_id, read_up_to) values (new.chat_id, new.user_id, new.last_read_at);
    -- Now and then, drop this person's rows in this chat older than 60 days
    if random() < 0.05 then
      delete from public.chat_read_log
      where chat_id = new.chat_id and user_id = new.user_id and read_at < now() - interval '60 days';
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists chat_read_log_on_read on public.chat_participants;
create trigger chat_read_log_on_read
  after update of last_read_at on public.chat_participants
  for each row execute function public.log_chat_read();

-- For my message: when each person first saw it (null = seen before times were kept,
-- or the message is over 59 days old). Only the sender gets anything back.
drop function if exists public.chat_message_reads(uuid);
create function public.chat_message_reads(_message_id uuid)
returns table (user_id uuid, read_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (l.user_id)
    l.user_id,
    case when m.created_at > now() - interval '59 days' then greatest(l.read_at, m.created_at) end
  from public.chat_messages m
  join public.chat_read_log l on l.chat_id = m.chat_id and l.read_up_to >= m.created_at
  where m.id = _message_id
    and m.user_id = auth.uid()
    and l.user_id <> m.user_id
  order by l.user_id, l.read_at asc;
$$;

revoke all on function public.chat_message_reads(uuid) from public;
revoke all on function public.chat_message_reads(uuid) from anon;
grant execute on function public.chat_message_reads(uuid) to authenticated;
