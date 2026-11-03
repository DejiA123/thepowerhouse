-- "Mark as unread", like WhatsApp: each member's own flag on their membership
-- row (members already change their own row; chat_participant_guard keeps it in
-- its chat). It only changes what I see: the others' read ticks stay as they
-- are. Opening the chat clears it. Safe to run again.
alter table public.chat_participants add column if not exists marked_unread boolean not null default false;
