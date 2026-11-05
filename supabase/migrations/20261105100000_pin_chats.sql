-- Pin chats to the top of my list, like WhatsApp (each member's own, up to 3).
-- Members already update their own row (mute, archive, mark unread); the guard
-- keeps its chat, person and join time unchanged. Safe to run again.
alter table public.chat_participants add column if not exists pinned_at timestamptz;
