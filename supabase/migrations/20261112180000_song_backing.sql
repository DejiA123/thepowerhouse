-- Compose a song: a clean backing track (Nov 2026). The music studio plays the song's
-- style, key and tempo again with no singer at all, for writers who want to put their own
-- song on top ("Music only" is the sung recording with the voices taken out, which always
-- leaves a trace). Made only when the writer asks; set only by the song-writer function.
alter table public.song_drafts add column if not exists backing_url text;
alter table public.song_drafts add column if not exists backing_status text not null default 'none';
alter table public.song_drafts add column if not exists backing_job jsonb;

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
    new.stems_model := old.stems_model;
    new.backing_url := old.backing_url;
    new.backing_status := old.backing_status;
    new.backing_job := old.backing_job;
    new.music_requested_at := old.music_requested_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- The watch job also runs while a backing track is being made
do $$
begin
  if exists (select 1 from cron.job where jobname = 'song-music-watch') then
    perform cron.unschedule('song-music-watch');
  end if;
  perform cron.schedule(
    'song-music-watch',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://swjzhzmhqyvwfwevijja.supabase.co/functions/v1/song-writer',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ'
        ),
        body := '{"action": "watch-all"}'::jsonb
      )
      where exists (
        select 1 from public.song_drafts
        where audio_status = 'making'
           or (audio_status = 'ready' and audio_url is not null
               and (instrumental_url is null or audio_sections is null)
               and updated_at > now() - interval '1 day')
           or (audio_status = 'ready' and audio_url is not null
               and instrumental_url is not null and stems_model is null
               and created_at > now() - interval '60 days')
           or backing_status = 'making'
      );
    $job$
  );
end;
$$;
