-- The Power House's choir group back to private (it was switched to community to
-- test it): only people the admins add, or with the invite link, can join. Safe to
-- run again.
update public.group_chats
   set is_private = true
 where church_id = '7a1c0de5-0000-4000-8000-000000000001'
   and lower(btrim(name)) = 'choir'
   and coalesce(description, '') <> 'Private chat';
