-- "This message was deleted", like WhatsApp: deleted messages stay hidden by
-- the read rule (their text never leaves the database), and members of the
-- chat get only where they were: id, sender and time, so the app can show a
-- note in their place. Safe to run again.
drop function if exists public.deleted_chat_messages(uuid, timestamptz, timestamptz);
create function public.deleted_chat_messages(_chat_id uuid, _from timestamptz default null, _to timestamptz default null)
returns table (id uuid, chat_id uuid, user_id uuid, created_at timestamptz, imported_from text, imported_as uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.chat_id, m.user_id, m.created_at, m.imported_from, m.imported_as, p.full_name, p.avatar_url
  from public.chat_messages m
  left join public.profiles p on p.id = m.user_id
  where m.chat_id = _chat_id
    and coalesce(m.is_deleted, false)
    and exists (select 1 from public.chat_participants cp where cp.chat_id = _chat_id and cp.user_id = auth.uid())
    and (_from is null or m.created_at >= _from)
    and (_to is null or m.created_at <= _to)
  order by m.created_at desc
  limit 500;
$$;

revoke all on function public.deleted_chat_messages(uuid, timestamptz, timestamptz) from public;
revoke all on function public.deleted_chat_messages(uuid, timestamptz, timestamptz) from anon;
grant execute on function public.deleted_chat_messages(uuid, timestamptz, timestamptz) to authenticated;
