-- Ayodeji Augustine (dejiaugustine@gmail.com, the church admin) is a group admin of
-- The Power House's choir group, so the member list says "Group admin" beside his
-- name. The choir group began as a church community group with no admins at all.
-- He's added to the group too if he isn't in it. Safe to run again.
insert into public.chat_participants (chat_id, user_id)
select c.id, u.id
  from public.group_chats c
  join auth.users u on lower(u.email) = 'dejiaugustine@gmail.com'
 where c.church_id = '7a1c0de5-0000-4000-8000-000000000001'
   and lower(btrim(c.name)) = 'choir'
   and coalesce(c.description, '') <> 'Private chat'
   and not exists (select 1 from public.chat_participants p where p.chat_id = c.id and p.user_id = u.id);

insert into public.group_admins (chat_id, user_id, can_add_members, can_remove_members, can_edit_info)
select c.id, u.id, true, true, true
  from public.group_chats c
  join auth.users u on lower(u.email) = 'dejiaugustine@gmail.com'
 where c.church_id = '7a1c0de5-0000-4000-8000-000000000001'
   and lower(btrim(c.name)) = 'choir'
   and coalesce(c.description, '') <> 'Private chat'
   and not exists (select 1 from public.group_admins a where a.chat_id = c.id and a.user_id = u.id);
