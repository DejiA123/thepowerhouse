-- Compose a song: the same recording split in two (music server, Demucs): the music only
-- (instrumental, to sing or read along to) and the voices only (to learn the parts).
-- Set only by the song-writer function; stems_at = when a split was started (one at a time).
alter table public.song_drafts add column if not exists instrumental_url text;
alter table public.song_drafts add column if not exists vocals_url text;
alter table public.song_drafts add column if not exists stems_at timestamptz;

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
    new.audio_job := old.audio_job;
    new.audio_sections := old.audio_sections;
    new.instrumental_url := old.instrumental_url;
    new.vocals_url := old.vocals_url;
    new.stems_at := old.stems_at;
    new.music_requested_at := old.music_requested_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
