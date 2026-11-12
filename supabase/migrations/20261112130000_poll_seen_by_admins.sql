-- A group's admins can see who has seen a poll, and when (Poll details), like a message's
-- sender can in Message info. Messages are end-to-end encrypted, so the server can't tell a
-- poll from any other message: chat_message_reads now also answers the group's admins
-- (can_manage_chat) for messages in their group, and the app asks only for polls. Everyone
-- in a group can already see how far each member has read (that's what the ✓✓ use); this
-- adds only when. The message's sender is still left out of the answer. Safe to run again.

create or replace function public.chat_message_reads(_message_id uuid)
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
    and (m.user_id = auth.uid() or public.can_manage_chat(m.chat_id))
    and l.user_id <> m.user_id
  order by l.user_id, l.read_at asc;
$$;

revoke all on function public.chat_message_reads(uuid) from public;
revoke all on function public.chat_message_reads(uuid) from anon;
grant execute on function public.chat_message_reads(uuid) to authenticated;
