-- Music only / voices only: which separation made a song's two versions (Nov 2026).
-- Songs split by the old model (Demucs, `stems_model` null) are split again with the
-- RoFormer models; each keeps its old versions until the new ones are ready.
alter table public.song_drafts add column if not exists stems_model text;

-- The watch job also runs while any song still has the old split
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
      );
    $job$
  );
end;
$$;
