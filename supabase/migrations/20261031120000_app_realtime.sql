-- Live everywhere. Screens that show shared things (announcements, events, the live
-- service, the prayer wall, choir songs and sets, the follow-up list, notes on your
-- other devices, feedback for admins) now update as they change, but only tables in
-- the realtime publication send changes. Realtime keeps every table's own rules:
-- people only hear about rows they're allowed to read. Safe to run again.
do $$
declare
  t text;
begin
  foreach t in array array[
    'announcements', 'events', 'live_services',
    'prayer_requests', 'prayer_request_prayers',
    'choir_songs', 'choir_folders', 'choir_weekly_set_songs', 'choir_instrumental_resources',
    'choir_setlist_info', 'choir_calendar_events',
    'choir_academy_modules', 'choir_academy_quizzes', 'choir_academy_questions',
    'team_follow_ups', 'app_feedback', 'group_members', 'service_attendance',
    'bible_notes', 'bible_note_folders'
  ] loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
