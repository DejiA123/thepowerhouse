-- Private or community groups. A private group is only joined by being added by its
-- admins or through its invite link; a community group is listed for everyone in the
-- church to join. Groups made in the app (and one-to-one chats) have always been
-- private; the church's community groups stay open, except The Power House's choir
-- group, which its leaders want private. New groups start private, like WhatsApp.
-- Before this anyone signed in could add themselves to any group they knew the id of
-- (the participants' insert rule allowed "user_id = auth.uid()"); that's closed for
-- private groups below. Safe to run again.

alter table public.group_chats add column if not exists is_private boolean;
update public.group_chats
   set is_private = (coalesce(is_custom, false) or coalesce(description, '') = 'Private chat')
 where is_private is null;
update public.group_chats
   set is_private = true
 where church_id = '7a1c0de5-0000-4000-8000-000000000001'
   and lower(btrim(name)) = 'choir'
   and coalesce(description, '') <> 'Private chat';
alter table public.group_chats alter column is_private set default true;
alter table public.group_chats alter column is_private set not null;

-- Is this group private? (one-to-one chats always are)
create or replace function public.chat_is_private(_chat_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select c.is_private or coalesce(c.description, '') = 'Private chat' from public.group_chats c where c.id = _chat_id), true);
$$;
revoke all on function public.chat_is_private(uuid) from public, anon;
grant execute on function public.chat_is_private(uuid) to authenticated;

-- Nobody joins a private group by themselves: only its admins (or creator, or a church
-- admin) add people; invite links and "Add members" go through their own functions
drop policy if exists "Private groups: only admins add people" on public.chat_participants;
create policy "Private groups: only admins add people" on public.chat_participants
  as restrictive for insert to authenticated
  with check (not public.chat_is_private(chat_id) or public.can_manage_chat(chat_id));

-- Change a group between private and community (its admins)
create or replace function public.set_chat_private(_chat_id uuid, _private boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can change who can join' using errcode = '42501';
  end if;
  update public.group_chats set is_private = coalesce(_private, true) where id = _chat_id;
end;
$$;
revoke all on function public.set_chat_private(uuid, boolean) from public, anon;
grant execute on function public.set_chat_private(uuid, boolean) to authenticated;
