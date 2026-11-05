-- Group admins add people, like WhatsApp. The table's own rule only lets admins whose
-- admin record has "can add members" switched on (so a church admin, or a creator
-- with no admin record, couldn't), so this checks who's asking and adds them.
-- Safe to run again.
create or replace function public.add_chat_members(_chat_id uuid, _user_ids uuid[])
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  added integer;
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can add people' using errcode = '42501';
  end if;
  if coalesce(array_length(_user_ids, 1), 0) > 256 then
    raise exception 'Add up to 256 people at a time' using errcode = '22023';
  end if;
  insert into public.chat_participants (chat_id, user_id)
  select _chat_id, u
    from (select distinct unnest(_user_ids) as u) people
   where u is not null
     and exists (select 1 from public.profiles p where p.id = u)
     and not exists (select 1 from public.chat_participants c where c.chat_id = _chat_id and c.user_id = u);
  get diagnostics added = row_count;
  return added;
end;
$$;
revoke all on function public.add_chat_members(uuid, uuid[]) from public, anon;
grant execute on function public.add_chat_members(uuid, uuid[]) to authenticated;
