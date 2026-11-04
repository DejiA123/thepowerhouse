-- Which phone (encryption device) each notification subscription belongs to, so a
-- chat notification carries the key copy sealed for exactly that phone and always
-- shows the message (before, only a user's 4 newest devices got copies, and the
-- Home Screen app could be left out: "🔒 New message"). Safe to run again.
alter table public.push_subscriptions add column if not exists device_id text;
