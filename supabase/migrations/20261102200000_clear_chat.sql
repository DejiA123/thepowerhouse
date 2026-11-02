-- "Clear chat", like WhatsApp: empties a chat for one member only (everyone
-- else keeps their messages). Messages up to this time are hidden from that
-- member, except ones they starred and chose to keep. Members change it on
-- their own row (the "Users can update their own participation" rule;
-- chat_participant_guard keeps the row in its chat). Safe to run again.
alter table public.chat_participants add column if not exists cleared_at timestamptz;
