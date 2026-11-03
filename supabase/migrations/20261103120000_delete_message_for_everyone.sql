-- "Delete for everyone" through a function. The read rule hides deleted
-- messages, and an update that the app sends returns the changed row, so the
-- database refused the sender's own delete ("new row violates row-level
-- security"). This marks the sender's own message as deleted; the
-- chat_message_guard trigger still runs (auth.uid() is the caller), so the
-- 2-day limit and everything else it checks still apply. Safe to run again.
create or replace function public.delete_chat_message(_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.chat_messages
     set is_deleted = true
   where id = _message_id
     and user_id = auth.uid()
     and not coalesce(is_deleted, false);
  if found then
    return true;
  end if;
  -- Already deleted (a second tap, another device): nothing to do
  if exists (select 1 from public.chat_messages where id = _message_id and user_id = auth.uid()) then
    return false;
  end if;
  raise exception 'Message not found' using errcode = 'P0002';
end;
$$;

revoke all on function public.delete_chat_message(uuid) from public;
revoke all on function public.delete_chat_message(uuid) from anon;
grant execute on function public.delete_chat_message(uuid) to authenticated;
