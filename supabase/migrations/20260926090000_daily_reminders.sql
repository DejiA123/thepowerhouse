-- Daily Verse and Reading Reminder notifications at a time each person chooses.
-- The send-daily-reminders edge function reads these columns every minute.

alter table public.notification_preferences
  add column if not exists daily_verse_enabled boolean not null default false,
  add column if not exists daily_verse_time text not null default '08:00',
  add column if not exists reading_reminder_enabled boolean not null default false,
  add column if not exists reading_reminder_time text not null default '19:00',
  add column if not exists timezone text not null default 'UTC',
  add column if not exists daily_verse_last_sent date,
  add column if not exists reading_reminder_last_sent date;

create index if not exists notification_preferences_reminders_idx
  on public.notification_preferences (user_id)
  where daily_verse_enabled or reading_reminder_enabled;

-- Run the reminders function every minute.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'send-daily-reminders';

select cron.schedule(
  'send-daily-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://swjzhzmhqyvwfwevijja.supabase.co/functions/v1/send-daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3anpoem1ocXl2d2Z3ZXZpamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjE4NDcsImV4cCI6MjA2NDc5Nzg0N30.M0WyKsQm_nqGCEUNKPpSOM8Au4BONv5VGlsI0YS1wBQ'
    ),
    body := '{}'::jsonb
  );
  $$
);
