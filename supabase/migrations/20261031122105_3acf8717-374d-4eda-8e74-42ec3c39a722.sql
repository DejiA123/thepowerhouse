-- Live Social Circle. The app listens for changes to your friendships (a request
-- sent to you, yours accepted, a friend removed) so the Friends and Requests lists
-- update straight away, but the friendships table was never in the realtime
-- publication, so they only changed when the page was opened again. Each person
-- only hears about their own friendships ("Users can view their own friendships").
-- Safe to run again.
do $$
begin
  if to_regclass('public.friendships') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;