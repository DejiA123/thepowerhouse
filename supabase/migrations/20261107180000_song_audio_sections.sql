-- Compose a song: where each section starts and ends in the recording, so members can
-- play one part at a time ([{name, start, end}] in seconds, matching the song's sections
-- when the music was made). Set only by the song-writer function.
alter table public.song_drafts add column if not exists audio_sections jsonb;

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
    new.music_requested_at := old.music_requested_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
