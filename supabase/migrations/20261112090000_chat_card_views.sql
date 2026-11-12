-- Who has seen the cards the app puts into a group chat (the group's reminders and the
-- choir's "songs added to Praise Set" cards), for the group's admins, like WhatsApp's
-- Message info.
--
-- These cards aren't messages, so read receipts can't tell: opening a chat marks it read
-- only up to its last message, and a card posted after that (a reminder with no message
-- since) would look unseen for ever. So each phone records when a card is actually on its
-- screen (chat_card_views, through mark_chat_cards_seen). For cards from before this, the
-- read history (chat_read_log, kept 60 days) still counts anyone who read on past the card.
-- Only the group's admins can ask who (chat_card_seen). Safe to run again.

create table if not exists public.chat_card_views (
  chat_id uuid not null references public.group_chats(id) on delete cascade,
  -- 'reminder': a chat_reminder_sends row; 'song': a choir_weekly_set_songs row (a song
  -- card records every song on it)
  kind text not null check (kind in ('reminder', 'song')),
  item_id uuid not null,
  user_id uuid not null,
  seen_at timestamptz not null default now(),
  primary key (chat_id, kind, item_id, user_id)
);

-- Nobody reads or writes it directly: only the two functions below
alter table public.chat_card_views enable row level security;
revoke all on public.chat_card_views from anon, authenticated;
grant all on public.chat_card_views to service_role;

-- A member's phone: "these cards are on my screen now". Only cards that really are in this
-- chat count (its reminders, its choir's songs), only for its members, and only the first
-- time (the time it was first seen is kept). Answers how many were new.
create or replace function public.mark_chat_cards_seen(_chat_id uuid, _reminders uuid[], _songs uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  added integer := 0;
  n integer;
begin
  if me is null or not exists (select 1 from public.chat_participants p where p.chat_id = _chat_id and p.user_id = me) then
    return 0;
  end if;
  if coalesce(array_length(_reminders, 1), 0) > 0 then
    insert into public.chat_card_views (chat_id, kind, item_id, user_id)
    select _chat_id, 'reminder', s.id, me
    from public.chat_reminder_sends s
    where s.chat_id = _chat_id and s.id = any (_reminders[1:200])
    on conflict do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end if;
  if coalesce(array_length(_songs, 1), 0) > 0 then
    insert into public.chat_card_views (chat_id, kind, item_id, user_id)
    select _chat_id, 'song', w.id, me
    from public.choir_weekly_set_songs w
    join public.choir_chat_links l on l.chat_id = _chat_id and lower(btrim(w.location)) = l.location
    where w.id = any (_songs[1:300])
    on conflict do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end if;
  return added;
end;
$$;

revoke all on function public.mark_chat_cards_seen(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.mark_chat_cards_seen(uuid, uuid[], uuid[]) to authenticated;

-- For the group's admins: when each person first saw each of these cards. Seen = the card
-- was on their screen, or they read the chat on past it (a message after it), whichever
-- came first. Anyone else gets an error.
drop function if exists public.chat_card_seen(uuid, uuid[], uuid[]);
create function public.chat_card_seen(_chat_id uuid, _reminders uuid[], _songs uuid[])
returns table (kind text, item_id uuid, user_id uuid, seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can see who has seen it' using errcode = '42501';
  end if;
  return query
  with items as (
    select 'reminder'::text as kind, s.id, s.sent_at as at
    from public.chat_reminder_sends s
    where s.chat_id = _chat_id and s.id = any ((coalesce(_reminders, '{}'::uuid[]))[1:200])
    union all
    select 'song'::text, w.id, w.created_at
    from public.choir_weekly_set_songs w
    join public.choir_chat_links l on l.chat_id = _chat_id and lower(btrim(w.location)) = l.location
    where w.id = any ((coalesce(_songs, '{}'::uuid[]))[1:300])
  ),
  seen as (
    select v.kind, v.item_id, v.user_id, v.seen_at
    from public.chat_card_views v
    join items i on i.kind = v.kind and i.id = v.item_id
    where v.chat_id = _chat_id
    union all
    select i.kind, i.id, r.user_id, greatest(min(r.read_at), i.at)
    from items i
    join public.chat_read_log r on r.chat_id = _chat_id and r.read_up_to >= i.at
    group by i.kind, i.id, i.at, r.user_id
  )
  select s.kind, s.item_id, s.user_id, min(s.seen_at)
  from seen s
  group by s.kind, s.item_id, s.user_id;
end;
$$;

revoke all on function public.chat_card_seen(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.chat_card_seen(uuid, uuid[], uuid[]) to authenticated;
