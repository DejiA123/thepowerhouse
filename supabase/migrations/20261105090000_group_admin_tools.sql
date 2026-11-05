-- Group admins, like WhatsApp: an admin can remove people from the group and make
-- other members admins (or dismiss them as admin). The tables' own rules only let
-- people remove themselves, so "Remove from group" quietly did nothing; these
-- functions check who's asking and do it. Safe to run again.

-- Can I manage this group? Its admins, its creator, or a church admin (never a one-to-one chat)
create or replace function public.can_manage_chat(_chat_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
    and exists (select 1 from public.group_chats c where c.id = _chat_id and coalesce(c.description, '') <> 'Private chat')
    and (
      exists (select 1 from public.group_admins a where a.chat_id = _chat_id and a.user_id = auth.uid())
      or exists (select 1 from public.group_chats c where c.id = _chat_id and c.created_by = auth.uid())
      or coalesce(public.is_admin(auth.uid()), false)
    );
$$;
revoke all on function public.can_manage_chat(uuid) from public, anon;
grant execute on function public.can_manage_chat(uuid) to authenticated;

-- Remove someone from a group (their admin role goes too)
create or replace function public.remove_chat_member(_chat_id uuid, _user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can remove people' using errcode = '42501';
  end if;
  if _user_id = auth.uid() then
    raise exception 'Use Leave group to leave' using errcode = '22023';
  end if;
  -- The person who made the group can only be removed by a church admin
  if exists (select 1 from public.group_chats c where c.id = _chat_id and c.created_by = _user_id)
     and not coalesce(public.is_admin(auth.uid()), false) then
    raise exception 'The group''s creator can''t be removed' using errcode = '42501';
  end if;
  delete from public.group_admins where chat_id = _chat_id and user_id = _user_id;
  delete from public.chat_participants where chat_id = _chat_id and user_id = _user_id;
end;
$$;
revoke all on function public.remove_chat_member(uuid, uuid) from public, anon;
grant execute on function public.remove_chat_member(uuid, uuid) to authenticated;

-- Make a member an admin, or dismiss them as admin
create or replace function public.set_chat_admin(_chat_id uuid, _user_id uuid, _admin boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can change admins' using errcode = '42501';
  end if;
  if not exists (select 1 from public.chat_participants p where p.chat_id = _chat_id and p.user_id = _user_id) then
    raise exception 'They''re not in this group' using errcode = '22023';
  end if;
  if _admin then
    if not exists (select 1 from public.group_admins a where a.chat_id = _chat_id and a.user_id = _user_id) then
      insert into public.group_admins (chat_id, user_id, can_add_members, can_remove_members, can_edit_info)
      values (_chat_id, _user_id, true, true, true);
    end if;
  else
    delete from public.group_admins where chat_id = _chat_id and user_id = _user_id;
  end if;
end;
$$;
revoke all on function public.set_chat_admin(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_chat_admin(uuid, uuid, boolean) to authenticated;
