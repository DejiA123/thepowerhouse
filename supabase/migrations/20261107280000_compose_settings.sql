-- Compose a song → Advanced settings (church admins only): each church's choices for
-- everyone composing songs there. `studio`: music made on the studio server (the full
-- XL model with the 4B planner); on unless an admin switches it off (no row = on).
-- Read and written only by the song-writer function (service role). Safe to run again.
create table if not exists public.church_compose_settings (
  church_id uuid primary key,
  studio boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.church_compose_settings enable row level security;
revoke all on public.church_compose_settings from anon, authenticated;
