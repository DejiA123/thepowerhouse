-- Live Bible highlights: one made or removed on your other phone or computer shows
-- in the open chapter straight away. Each person only hears about their own
-- highlights (the table's own rules). Safe to run again.
do $$
begin
  if to_regclass('public.bible_highlights') is not null and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bible_highlights'
  ) then
    alter publication supabase_realtime add table public.bible_highlights;
  end if;
end $$;
