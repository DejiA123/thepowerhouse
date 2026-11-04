-- 1) A group chat can be the chat of a choir (National, Galway, …): it then shows
--    a card whenever a song is added to that choir's setlist, and the setlist
--    pinned at the top. Set by the group's admins (or its creator, or a church
--    admin). Members can see which choir their chat is linked to.
-- 2) Polls in chats, like WhatsApp: the question and options are inside the
--    (encrypted) message; votes are just "this person picked option n".
-- Safe to run again.

create table if not exists public.choir_chat_links (
  chat_id uuid primary key references public.group_chats(id) on delete cascade,
  location text not null,
  set_by uuid default auth.uid(),
  set_at timestamptz not null default now()
);
alter table public.choir_chat_links enable row level security;
revoke all on public.choir_chat_links from anon;
grant select on public.choir_chat_links to authenticated;
drop policy if exists "Members see their chat's choir" on public.choir_chat_links;
create policy "Members see their chat's choir" on public.choir_chat_links
  for select to authenticated using (public.is_chat_member(chat_id));

-- Link (or unlink, with an empty location) a group chat to a choir
create or replace function public.link_chat_to_choir(_chat_id uuid, _location text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_invite_to_chat(_chat_id) then
    raise exception 'Only the group''s admins can link it to a choir' using errcode = '42501';
  end if;
  if coalesce(btrim(_location), '') = '' then
    delete from public.choir_chat_links where chat_id = _chat_id;
  else
    insert into public.choir_chat_links (chat_id, location, set_by, set_at)
    values (_chat_id, lower(btrim(_location)), auth.uid(), now())
    on conflict (chat_id) do update set location = excluded.location, set_by = excluded.set_by, set_at = excluded.set_at;
  end if;
end;
$$;
revoke all on function public.link_chat_to_choir(uuid, text) from public, anon;
grant execute on function public.link_chat_to_choir(uuid, text) to authenticated;

-- Polls: votes
create table if not exists public.chat_poll_votes (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  option_index integer not null check (option_index between 0 and 11),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, option_index)
);
create index if not exists chat_poll_votes_chat_idx on public.chat_poll_votes (chat_id);
alter table public.chat_poll_votes enable row level security;
revoke all on public.chat_poll_votes from anon;
grant select, insert, delete on public.chat_poll_votes to authenticated;

drop policy if exists "Members see a poll's votes" on public.chat_poll_votes;
create policy "Members see a poll's votes" on public.chat_poll_votes
  for select to authenticated using (public.is_chat_member(chat_id));
drop policy if exists "Members vote" on public.chat_poll_votes;
create policy "Members vote" on public.chat_poll_votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_chat_member(chat_id)
    and exists (select 1 from public.chat_messages m where m.id = message_id and m.chat_id = chat_poll_votes.chat_id)
  );
drop policy if exists "Members take back their vote" on public.chat_poll_votes;
create policy "Members take back their vote" on public.chat_poll_votes
  for delete to authenticated using (user_id = auth.uid());

-- Votes show up live
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_poll_votes'
  ) then
    alter publication supabase_realtime add table public.chat_poll_votes;
  end if;
exception when undefined_object then
  null; -- no realtime publication (local tests)
end $$;
