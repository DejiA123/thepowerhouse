-- Follow-up team (Teams → Team follow-up): visitors' names, phone numbers and notes.
-- The page has no accounts, and the database let anyone read, change or delete these
-- records. Now only someone with the team's passcode (or a church admin) can see or
-- change them: the app sends it as header x-follow-up-key once unlocked, and the
-- database checks it against a hash kept here, where nobody can read it.
-- The newcomer survey is separate (service_feedback) and still needs no account.
--
-- Set or change the passcode (until it's set, only church admins can open the list):
--   insert into public.follow_up_passcodes (church_id, passcode_hash)
--   values ('7a1c0de5-0000-4000-8000-000000000001', public.choir_passcode_hash('TEAM PASSCODE'))
--   on conflict (church_id) do update set passcode_hash = excluded.passcode_hash, updated_at = now();

create table if not exists public.follow_up_passcodes (
  church_id uuid primary key,
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.follow_up_passcodes enable row level security;
revoke all on public.follow_up_passcodes from anon, authenticated;

-- The unlock button: is this the team's passcode?
create or replace function public.follow_up_unlock(_passcode text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from follow_up_passcodes p
    where p.church_id = public.current_church_id()
      and p.passcode_hash = public.choir_passcode_hash(_passcode)
  )
$$;

-- May this request see and change the follow-up list? The passcode, or a church admin.
create or replace function public.follow_up_access()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  sent text := nullif(current_setting('request.headers', true), '')::json ->> 'x-follow-up-key';
begin
  if public.is_admin(auth.uid()) then
    return true;
  end if;
  return sent is not null and public.follow_up_unlock(sent);
end;
$$;

revoke all on function public.follow_up_unlock(text) from public;
revoke all on function public.follow_up_access() from public;
grant execute on function public.follow_up_unlock(text) to anon, authenticated;
grant execute on function public.follow_up_access() to anon, authenticated;

do $$
begin
  if to_regclass('public.team_follow_ups') is null then
    return;
  end if;
  alter table public.team_follow_ups enable row level security;
  drop policy if exists "Follow-up team: passcode to see" on public.team_follow_ups;
  drop policy if exists "Follow-up team: passcode to add" on public.team_follow_ups;
  drop policy if exists "Follow-up team: passcode to change" on public.team_follow_ups;
  drop policy if exists "Follow-up team: passcode to delete" on public.team_follow_ups;
  create policy "Follow-up team: passcode to see" on public.team_follow_ups as restrictive for select to public
    using (public.follow_up_access());
  create policy "Follow-up team: passcode to add" on public.team_follow_ups as restrictive for insert to public
    with check (public.follow_up_access());
  create policy "Follow-up team: passcode to change" on public.team_follow_ups as restrictive for update to public
    using (public.follow_up_access()) with check (public.follow_up_access());
  create policy "Follow-up team: passcode to delete" on public.team_follow_ups as restrictive for delete to public
    using (public.follow_up_access());
end;
$$;