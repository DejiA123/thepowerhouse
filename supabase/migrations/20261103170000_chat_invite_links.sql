-- Group invite links, like WhatsApp: a group's admins (or its creator, or a church
-- admin) get a link; anyone with it sees the group's name and picture and can join
-- in one tap once signed in. Resetting the link stops the old one working.
-- The table is only reached through the functions below. Safe to run again.
create table if not exists public.chat_invite_links (
  code text primary key,
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists chat_invite_links_chat_idx on public.chat_invite_links (chat_id) where revoked_at is null;
alter table public.chat_invite_links enable row level security;
revoke all on public.chat_invite_links from anon, authenticated;

-- Can I hand out this group's link? Its admins, its creator, or a church admin (never a one-to-one chat)
create or replace function public.can_invite_to_chat(_chat_id uuid)
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

-- The group's link (made the first time); _reset makes a new one and stops the old
create or replace function public.chat_invite_link(_chat_id uuid, _reset boolean default false)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  link text;
begin
  if not public.can_invite_to_chat(_chat_id) then
    raise exception 'Only the group''s admins can share its link' using errcode = '42501';
  end if;
  if _reset then
    update public.chat_invite_links set revoked_at = now() where chat_id = _chat_id and revoked_at is null;
  else
    select code into link from public.chat_invite_links
    where chat_id = _chat_id and revoked_at is null order by created_at desc limit 1;
    if link is not null then
      return link;
    end if;
  end if;
  link := substr(md5(random()::text || clock_timestamp()::text || _chat_id::text), 1, 12);
  insert into public.chat_invite_links (code, chat_id) values (link, _chat_id);
  return link;
end;
$$;

-- What a link leads to (shown before signing in): the group's name, picture and size
create or replace function public.chat_invite_preview(_code text)
returns table (chat_id uuid, name text, description text, avatar_url text, members integer, is_member boolean)
language sql stable security definer set search_path = public
as $$
  select c.id, c.name, c.description, c.avatar_url,
         (select count(*)::int from public.chat_participants p where p.chat_id = c.id),
         auth.uid() is not null and exists (select 1 from public.chat_participants p where p.chat_id = c.id and p.user_id = auth.uid())
  from public.chat_invite_links l
  join public.group_chats c on c.id = l.chat_id
  where l.code = _code and l.revoked_at is null;
$$;

-- Join with a link (signed in): I'm added to the group
create or replace function public.join_chat_by_invite(_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join' using errcode = '42501';
  end if;
  select chat_id into target from public.chat_invite_links where code = _code and revoked_at is null;
  if target is null then
    raise exception 'This invite link has been reset or doesn''t exist' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.chat_participants where chat_id = target and user_id = auth.uid()) then
    insert into public.chat_participants (chat_id, user_id) values (target, auth.uid());
  end if;
  return target;
end;
$$;

revoke all on function public.can_invite_to_chat(uuid) from public, anon;
revoke all on function public.chat_invite_link(uuid, boolean) from public, anon;
revoke all on function public.join_chat_by_invite(text) from public, anon;
revoke all on function public.chat_invite_preview(text) from public;
grant execute on function public.can_invite_to_chat(uuid) to authenticated;
grant execute on function public.chat_invite_link(uuid, boolean) to authenticated;
grant execute on function public.join_chat_by_invite(text) to authenticated;
grant execute on function public.chat_invite_preview(text) to anon, authenticated;
