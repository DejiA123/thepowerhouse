-- Who the group's admins are, for its members (like WhatsApp's "Group admin" in the
-- member list): its admins plus whoever made the group. The admins table's own rules
-- may only show people their own row, so this asks with the function's rights.
-- Safe to run again.
create or replace function public.chat_admin_ids(_chat_id uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select a.user_id from public.group_admins a
   where a.chat_id = _chat_id and public.is_chat_member(_chat_id)
  union
  select c.created_by from public.group_chats c
   where c.id = _chat_id and c.created_by is not null
     and coalesce(c.description, '') <> 'Private chat'
     and public.is_chat_member(_chat_id)
     and exists (select 1 from public.chat_participants p where p.chat_id = _chat_id and p.user_id = c.created_by);
$$;
revoke all on function public.chat_admin_ids(uuid) from public, anon;
grant execute on function public.chat_admin_ids(uuid) to authenticated;
