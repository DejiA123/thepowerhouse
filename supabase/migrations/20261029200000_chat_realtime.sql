-- Live chats. The app listens for new messages, read receipts and reactions as
-- they happen (realtime postgres_changes), but the chat tables were never added
-- to the realtime publication (and create_group_chats.sql drops and recreates
-- them, which takes a table out of it). So the Messages and Friends lists, the
-- in-app banners, read ticks and your own call records only updated when a chat
-- was reopened. Safe to run again.
do $$
declare
  t text;
begin
  foreach t in array array['chat_messages', 'chat_participants', 'message_reactions'] loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
