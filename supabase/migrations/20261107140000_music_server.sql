-- The church's own ACE-Step music server (music-server/ace_step.py on Modal).
-- 1. church_service_keys takes the service 'acestep': its address and key, saved by the
--    "Deploy music server" workflow as a platform entry (church 00000000-…), kept in Vault.
-- 2. song_drafts.audio_job: the song being made on the server ({service, task_id,
--    submitted_at}), so it can be picked up again after the function's time runs out
--    (the first song wakes the server, which can take minutes). Writers can't change it.
-- Safe to run again.

alter table public.church_service_keys drop constraint if exists church_service_keys_service_check;
alter table public.church_service_keys add constraint church_service_keys_service_check
  check (service in ('acemusic', 'huggingface', 'acestep'));

create or replace function public.put_service_key(_church uuid, _service text, _key text, _by uuid)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  _id uuid;
  _name text := 'service:' || _service || ':' || _church::text;
  _about text := 'Music service key for Compose a song';
begin
  if _service not in ('acemusic', 'huggingface', 'acestep') or coalesce(length(_key), 0) < 8 then
    raise exception 'bad service key';
  end if;
  select k.secret_id into _id from public.church_service_keys k
    where k.church_id = _church and k.service = _service and exists (select 1 from vault.secrets s where s.id = k.secret_id);
  if _id is null then
    select s.id into _id from vault.secrets s where s.name = _name;
  end if;
  if _id is null then
    _id := vault.create_secret(_key, _name, _about);
  else
    perform vault.update_secret(_id, _key, _name, _about);
  end if;
  insert into public.church_service_keys (church_id, service, secret_id, hint, updated_by, updated_at)
  values (_church, _service, _id, right(_key, 4), _by, now())
  on conflict (church_id, service) do update
    set secret_id = excluded.secret_id, hint = excluded.hint, updated_by = excluded.updated_by, updated_at = now();
end;
$$;
revoke all on function public.put_service_key(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.put_service_key(uuid, text, text, uuid) to service_role;

alter table public.song_drafts add column if not exists audio_job jsonb;

create or replace function public.song_draft_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.id := old.id;
    new.church_id := old.church_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.audio_url := old.audio_url;
    new.audio_status := old.audio_status;
    new.audio_error := old.audio_error;
    new.audio_job := old.audio_job;
    new.music_requested_at := old.music_requested_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
