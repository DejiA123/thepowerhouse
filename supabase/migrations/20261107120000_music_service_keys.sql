-- Compose a song → the music service a church connects once (Compose a song → "Connect
-- the music service", church admins only, through the song-writer function, which checks
-- the key with the service first). The key itself is kept in Supabase Vault; this table
-- only says which service is connected and the key's last four characters. Only the
-- song-writer function (service role) saves, reads or removes keys: members never can.
-- Safe to run again.

create table if not exists public.church_service_keys (
  church_id uuid not null,
  service text not null check (service in ('acemusic', 'huggingface')),
  secret_id uuid not null,
  hint text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (church_id, service)
);
alter table public.church_service_keys enable row level security;
revoke all on public.church_service_keys from anon, authenticated;
grant select, insert, update, delete on public.church_service_keys to service_role;

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
  if _service not in ('acemusic', 'huggingface') or coalesce(length(_key), 0) < 8 then
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

create or replace function public.service_key(_church uuid, _service text)
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select d.decrypted_secret
  from public.church_service_keys k
  join vault.decrypted_secrets d on d.id = k.secret_id
  where k.church_id = _church and k.service = _service
$$;

create or replace function public.remove_service_key(_church uuid, _service text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  _id uuid;
begin
  delete from public.church_service_keys where church_id = _church and service = _service returning secret_id into _id;
  if _id is not null then
    delete from vault.secrets where id = _id;
  end if;
end;
$$;

revoke all on function public.put_service_key(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.service_key(uuid, text) from public, anon, authenticated;
revoke all on function public.remove_service_key(uuid, text) from public, anon, authenticated;
grant execute on function public.put_service_key(uuid, text, text, uuid) to service_role;
grant execute on function public.service_key(uuid, text) to service_role;
grant execute on function public.remove_service_key(uuid, text) to service_role;
