-- A choir's page opens its group chat (Nov 2026: "from the Galway Choir page I want to
-- get to the Galway choir chat"). Before this only people already in the chat could see
-- that a choir had one (choir_chat_links is members-only), so a choir member who wasn't
-- in it yet had no way to find it.
--
-- 1) choir_chats(location): the chat(s) linked to a choir, as the choir page shows them:
--    name, picture, how many members, private or community, am I in it, have I asked.
--    The same things an invite link shows before signing in; never messages or members.
-- 2) Asking to join, like WhatsApp's "Request to join": ask_to_join_chat adds me to a
--    community group straight away; for a private group it saves a request
--    (chat_join_requests) that the group's admins see in the chat and answer with Add
--    (add_chat_members, as before) or Decline (decline_chat_join_request). Adding someone
--    by any route (Add members, invite link) marks their request done (trigger).
--    Only chats linked to a choir can be asked to join this way.
-- Safe to run again.

create table if not exists public.chat_join_requests (
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  -- When the group's admins were last told (send-push claims it: at most once a day per person)
  notified_at timestamptz,
  answered_by uuid,
  answered_at timestamptz,
  primary key (chat_id, user_id)
);
create index if not exists chat_join_requests_pending_idx on public.chat_join_requests (chat_id) where status = 'pending';

-- I see my own requests; the group's admins see the requests to their group.
-- Asking and answering go through the functions below; I may take back my own request.
alter table public.chat_join_requests enable row level security;
revoke all on public.chat_join_requests from anon, authenticated;
grant select, delete on public.chat_join_requests to authenticated;
grant all on public.chat_join_requests to service_role;
drop policy if exists "Own requests and the group's admins" on public.chat_join_requests;
create policy "Own requests and the group's admins" on public.chat_join_requests
  for select to authenticated
  using (user_id = auth.uid() or public.can_manage_chat(chat_id));
drop policy if exists "Take back my own request" on public.chat_join_requests;
create policy "Take back my own request" on public.chat_join_requests
  for delete to authenticated
  using (user_id = auth.uid() and status = 'pending');

-- The chat(s) linked to a choir, as its page shows them (signed out too: name, picture, size)
create or replace function public.choir_chats(_location text)
returns table (
  chat_id uuid,
  name text,
  avatar_url text,
  members integer,
  is_private boolean,
  is_member boolean,
  asked_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select c.id,
         c.name,
         c.avatar_url,
         (select count(*)::int from public.chat_participants p where p.chat_id = c.id),
         coalesce(c.is_private, true),
         auth.uid() is not null and exists (
           select 1 from public.chat_participants p where p.chat_id = c.id and p.user_id = auth.uid()
         ),
         (select r.requested_at from public.chat_join_requests r
           where r.chat_id = c.id and r.user_id = auth.uid() and r.status = 'pending')
    from public.choir_chat_links l
    join public.group_chats c on c.id = l.chat_id
   where l.location = lower(btrim(coalesce(_location, '')))
     and coalesce(c.is_active, true)
     and coalesce(c.description, '') <> 'Private chat'
     and c.church_id is not distinct from public.current_church_id()
   order by l.set_at, c.name;
$$;
revoke all on function public.choir_chats(text) from public;
grant execute on function public.choir_chats(text) to anon, authenticated;

-- Join a choir's chat: a community group adds me at once ('joined'); a private group gets
-- a request for its admins ('asked'). 'member' if I'm already in it.
create or replace function public.ask_to_join_chat(_chat_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  grp record;
begin
  if me is null then
    raise exception 'Sign in to join' using errcode = '42501';
  end if;
  select c.id, c.is_private, c.description, c.is_active, c.church_id into grp
    from public.group_chats c where c.id = _chat_id;
  if grp.id is null
     or coalesce(grp.description, '') = 'Private chat'
     or grp.is_active = false
     or grp.church_id is distinct from public.current_church_id()
     or not exists (select 1 from public.choir_chat_links l where l.chat_id = _chat_id) then
    raise exception 'This chat can''t be joined from here' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.chat_participants p where p.chat_id = _chat_id and p.user_id = me) then
    return 'member';
  end if;
  if not coalesce(grp.is_private, true) then
    insert into public.chat_participants (chat_id, user_id) values (_chat_id, me);
    return 'joined';
  end if;
  -- A new request, or asking again after a decline (the admins are told at most once a day)
  insert into public.chat_join_requests (chat_id, user_id, status, requested_at)
  values (_chat_id, me, 'pending', now())
  on conflict (chat_id, user_id) do update
    set status = 'pending',
        requested_at = case when chat_join_requests.status = 'pending' then chat_join_requests.requested_at else now() end,
        answered_by = null,
        answered_at = null;
  return 'asked';
end;
$$;
revoke all on function public.ask_to_join_chat(uuid) from public, anon;
grant execute on function public.ask_to_join_chat(uuid) to authenticated;

-- The group's admins say no (they say yes with Add: add_chat_members)
create or replace function public.decline_chat_join_request(_chat_id uuid, _user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can answer requests' using errcode = '42501';
  end if;
  update public.chat_join_requests
     set status = 'declined', answered_by = auth.uid(), answered_at = now()
   where chat_id = _chat_id and user_id = _user_id and status = 'pending';
end;
$$;
revoke all on function public.decline_chat_join_request(uuid, uuid) from public, anon;
grant execute on function public.decline_chat_join_request(uuid, uuid) to authenticated;

-- Whoever adds someone (Add members, an invite link, joining a community group) answers
-- their request too
create or replace function public.chat_join_request_done()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.chat_join_requests
     set status = 'approved', answered_by = coalesce(auth.uid(), new.user_id), answered_at = now()
   where chat_id = new.chat_id and user_id = new.user_id and status = 'pending';
  return new;
end;
$$;
revoke all on function public.chat_join_request_done() from public, anon, authenticated;
drop trigger if exists chat_join_request_done on public.chat_participants;
create trigger chat_join_request_done
  after insert on public.chat_participants
  for each row execute function public.chat_join_request_done();

-- Requests show up live: for the admins in the chat, and "you were added" for the asker
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_join_requests'
  ) then
    alter publication supabase_realtime add table public.chat_join_requests;
  end if;
exception when undefined_object then
  null; -- no realtime publication (local tests)
end $$;
