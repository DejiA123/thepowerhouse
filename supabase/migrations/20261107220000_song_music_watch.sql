-- Compose a song: a safety net for songs being made with nobody on the page. Once a minute,
-- while any song is being made (or a new song still lacks its music-only / voices-only
-- versions or part times), the database nudges the song-writer function ("watch-all"),
-- which carries each such song on: sends it once the music server is ready, collects and
-- stores it, then splits it. The function's own hand-over between runs can fail; this
-- picks the song up within a minute. Uses the app's public key, like send-daily-reminders.
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
      );
    $job$
  );
end;
$$;
