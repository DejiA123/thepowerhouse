-- The live service's own chat, inside the app: members comment with their app
-- account (YouTube's chat needs a Google sign-in, which iPhones block inside
-- apps, and the channel's chat can be subscribers-only). Comments show to
-- everyone watching, live. A member can remove their own; church admins can
-- remove any. Safe to run again.

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null default public.current_church_id(),
  video_id text not null check (char_length(video_id) between 3 and 64),
  user_id uuid not null default auth.uid(),
  author_name text not null default '',
  author_avatar text,
  body text not null check (char_length(btrim(body)) between 1 and 400),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists live_chat_messages_video_idx on public.live_chat_messages (video_id, created_at);
alter table public.live_chat_messages enable row level security;
grant select on public.live_chat_messages to anon, authenticated;
grant insert (video_id, body) on public.live_chat_messages to authenticated;

-- The author's name and photo come from their profile (not from what the phone sends),
-- and nobody can post more than once a second
create or replace function public.live_chat_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  p record;
begin
  new.user_id := auth.uid();
  if new.user_id is null then
    raise exception 'Sign in to comment' using errcode = '42501';
  end if;
  new.body := btrim(new.body);
  new.created_at := now();
  new.deleted_at := null;
  if exists (
    select 1 from public.live_chat_messages m
    where m.user_id = new.user_id and m.created_at > now() - interval '1 second'
  ) then
    raise exception 'Slow down a little' using errcode = '54000';
  end if;
  select full_name, avatar_url into p from public.profiles where id = new.user_id;
  new.author_name := coalesce(nullif(btrim(p.full_name), ''), 'Member');
  new.author_avatar := p.avatar_url;
  return new;
end;
$$;
drop trigger if exists live_chat_before_insert on public.live_chat_messages;
create trigger live_chat_before_insert before insert on public.live_chat_messages
  for each row execute function public.live_chat_before_insert();

drop policy if exists "Everyone watching sees the chat" on public.live_chat_messages;
create policy "Everyone watching sees the chat" on public.live_chat_messages
  for select to anon, authenticated using (deleted_at is null);
drop policy if exists "Members comment as themselves" on public.live_chat_messages;
create policy "Members comment as themselves" on public.live_chat_messages
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Only this church" on public.live_chat_messages;
create policy "Only this church" on public.live_chat_messages as restrictive for all to public
  using (church_id = (select public.current_church_id()))
  with check (church_id = (select public.current_church_id()));

-- Remove a comment: your own, or any as a church admin
create or replace function public.remove_live_chat_message(_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.live_chat_messages
     set deleted_at = now()
   where id = _id
     and deleted_at is null
     and church_id = public.current_church_id()
     and (user_id = auth.uid() or coalesce(public.is_admin(auth.uid()), false));
  if not found then
    raise exception 'You can only remove your own comments' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.remove_live_chat_message(uuid) from public, anon;
grant execute on function public.remove_live_chat_message(uuid) to authenticated;

-- Comments arrive live
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_chat_messages'
  ) then
    alter publication supabase_realtime add table public.live_chat_messages;
  end if;
exception when undefined_object then
  null;
end $$;
