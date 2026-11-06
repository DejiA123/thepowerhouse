-- Compose a song (choir page → Compose a song): drafts written by the song helper
-- (lyrics with chords, arrangement notes) and, when asked for, the full song's audio.
-- A draft is its writer's own until they share it with the choir. Only the
-- song-writer function (service role) creates drafts and stores audio, so the daily
-- limits can't be dodged. Safe to run again.

create table if not exists public.song_drafts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null default public.current_church_id(),
  location text,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  brief jsonb not null default '{}'::jsonb,
  song jsonb not null,
  shared boolean not null default false,
  audio_url text,
  audio_status text not null default 'none' check (audio_status in ('none', 'making', 'ready', 'failed')),
  audio_error text,
  music_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists song_drafts_owner_idx on public.song_drafts (created_by, created_at desc);
create index if not exists song_drafts_shared_idx on public.song_drafts (church_id, location, created_at desc) where shared;

alter table public.song_drafts enable row level security;
revoke all on public.song_drafts from anon;
grant select, update, delete on public.song_drafts to authenticated;

drop policy if exists "Own or shared drafts" on public.song_drafts;
create policy "Own or shared drafts" on public.song_drafts
  for select to authenticated using (created_by = auth.uid() or shared);

drop policy if exists "Writers change their drafts" on public.song_drafts;
create policy "Writers change their drafts" on public.song_drafts
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "Writers delete their drafts" on public.song_drafts;
create policy "Writers delete their drafts" on public.song_drafts
  for delete to authenticated using (created_by = auth.uid());

drop policy if exists "Only this church" on public.song_drafts;
create policy "Only this church" on public.song_drafts as restrictive for all to public
  using (church_id = (select public.current_church_id()))
  with check (church_id = (select public.current_church_id()));

-- Writers may only change what they wrote (title, words, sharing), never the audio,
-- the owner or the limits' timestamps
create or replace function public.song_draft_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.id := old.id;
    new.church_id := old.church_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.audio_url := old.audio_url;
    new.audio_status := old.audio_status;
    new.audio_error := old.audio_error;
    new.music_requested_at := old.music_requested_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists song_draft_guard on public.song_drafts;
create trigger song_draft_guard before update on public.song_drafts
  for each row execute function public.song_draft_guard();

-- The finished songs' audio: anyone with the link can play it; only the function uploads
insert into storage.buckets (id, name, public)
values ('song-drafts', 'song-drafts', true)
on conflict (id) do update set public = true;
