-- Church Space, Phase 2, step 3
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.user_roles'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (user_id, role)'
  loop
    execute format('alter table public.user_roles drop constraint %I', c.conname);
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_roles_user_role_church_key') then
    alter table public.user_roles add constraint user_roles_user_role_church_key unique (user_id, role, church_id);
  end if;
end $$;

alter table public.church_members add column if not exists source text not null default 'joined';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'church_members_source_check') then
    alter table public.church_members add constraint church_members_source_check check (source in ('joined', 'auto'));
  end if;
end $$;

update public.churches
set profile = profile || '{"city": "Galway, Ireland", "logo": "/icons/icon-192.png", "icon192": "/icons/icon-192.png", "icon512": "/icons/icon-512.png", "colour": "blue"}'::jsonb
where id = '7a1c0de5-0000-4000-8000-000000000001' and not profile ? 'logo';

create or replace function public.reserved_church_slug(_slug text)
returns boolean
language sql
immutable
as $$
  select _slug = any (array[
    'admin', 'api', 'assets', 'auth', 'banners', 'bible', 'bible-notes', 'bible-reading-plans', 'brand', 'building-campaign',
    'c', 'campus-fellowship', 'campus-fellowships', 'church', 'church-space', 'churchspace', 'create-church', 'debug-email',
    'editor-frame', 'email-confirmation', 'find', 'follow-up', 'follow-up-team', 'fonts', 'fellowship-group', 'give',
    'google-sign-in', 'group-chats', 'groups', 'help', 'icons', 'install', 'intro', 'join', 'learn', 'locations',
    'manifest', 'me', 'new-here', 'news', 'prayer', 'privacy-policy', 'reset-password', 'resources', 'serve', 'services',
    'settings', 'social', 'social-media', 'space', 'splash', 'sw', 'team-follow-up', 'terms-of-service', 'test', 'workbox'
  ])
$$;

create or replace function public.join_default_church()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  wanted uuid;
  mode text;
begin
  select u.raw_user_meta_data into meta from auth.users u where u.id = new.id;
  if meta ->> 'church_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select c.id, c.join_mode into wanted, mode from churches c where c.id = (meta ->> 'church_id')::uuid;
  end if;
  if wanted is not null then
    insert into church_members (church_id, user_id, status)
    values (wanted, new.id, case when mode = 'open' then 'active' else 'pending' end)
    on conflict do nothing;
  else
    insert into church_members (church_id, user_id, source)
    values ('7a1c0de5-0000-4000-8000-000000000001', new.id, 'auto')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.join_default_church() from public, anon, authenticated;

create or replace function public.church_directory(search text default null, find_slug text default null, find_id uuid default null)
returns table (id uuid, slug text, name text, join_mode text, profile jsonb, members bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.slug, c.name, c.join_mode, c.profile,
    (select count(*) from church_members m where m.church_id = c.id and m.status = 'active')
  from churches c
  where case
    when find_id is not null then c.id = find_id
    when find_slug is not null then c.slug = lower(find_slug)
    else coalesce((c.profile ->> 'hidden')::boolean, false) = false
      and (coalesce(search, '') = ''
        or c.name ilike '%' || search || '%'
        or c.profile ->> 'city' ilike '%' || search || '%')
  end
  order by c.name
  limit 30
$$;

grant execute on function public.church_directory(text, text, uuid) to anon, authenticated;

create or replace function public.church_by_code(code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.slug from churches c where c.join_code = upper(regexp_replace(coalesce(code, ''), '\s', '', 'g'))
$$;

grant execute on function public.church_by_code(text) to anon, authenticated;

create or replace function public.join_church(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mode text;
  result text;
begin
  if uid is null then
    raise exception 'Sign in first';
  end if;
  select c.join_mode into mode from churches c where c.id = target;
  if mode is null then
    raise exception 'No such church';
  end if;
  insert into church_members (church_id, user_id, status)
  values (target, uid, case when mode = 'open' then 'active' else 'pending' end)
  on conflict (church_id, user_id) do update set source = 'joined';
  if target <> '7a1c0de5-0000-4000-8000-000000000001' then
    delete from church_members m
    where m.user_id = uid and m.source = 'auto' and m.church_id = '7a1c0de5-0000-4000-8000-000000000001'
      and m.joined_at > now() - interval '1 day';
  end if;
  select m.status into result from church_members m where m.church_id = target and m.user_id = uid;
  return result;
end;
$$;

revoke all on function public.join_church(uuid) from public, anon;
grant execute on function public.join_church(uuid) to authenticated;

create or replace function public.create_church(p_name text, p_slug text, p_role text, p_join_mode text, p_profile jsonb)
returns table (id uuid, slug text, join_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  code text;
  letters text := upper(left(regexp_replace(coalesce(p_name, ''), '[^A-Za-z]', '', 'g'), 6));
begin
  if uid is null then
    raise exception 'Sign in first';
  end if;
  p_slug := lower(trim(p_slug));
  if p_slug !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' or public.reserved_church_slug(p_slug) then
    raise exception 'That link can''t be used';
  end if;
  if exists (select 1 from churches c where c.slug = p_slug) then
    raise exception 'That link is taken';
  end if;
  if (select count(*) from churches c where c.created_by = uid) >= 3 then
    raise exception 'You''ve already created 3 church spaces';
  end if;
  if pg_column_size(p_profile) > 8000 then
    raise exception 'Too much information';
  end if;
  if length(letters) < 3 then
    letters := 'CHURCH';
  end if;
  loop
    code := letters || (10 + floor(random() * 90))::int;
    exit when not exists (select 1 from churches c where c.join_code = code);
  end loop;

  insert into churches (slug, name, join_code, join_mode, profile, created_by)
  values (p_slug, trim(p_name), code,
    case when p_join_mode = 'approval' then 'approval' else 'open' end,
    coalesce(p_profile, '{}'::jsonb), uid)
  returning churches.id into new_id;

  insert into church_members (church_id, user_id, status) values (new_id, uid, 'active');
  insert into user_roles (user_id, role, church_id, is_active) values (uid, 'administrator', new_id, true);
  if p_role = 'pastor' then
    insert into user_roles (user_id, role, church_id, is_active) values (uid, 'pastor', new_id, true);
  end if;

  return query select new_id, p_slug, code;
end;
$$;

revoke all on function public.create_church(text, text, text, text, jsonb) from public, anon;
grant execute on function public.create_church(text, text, text, text, jsonb) to authenticated;

create or replace function public.church_admin_info()
returns table (id uuid, slug text, name text, join_code text, join_mode text, profile jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  return query
  select c.id, c.slug, c.name, c.join_code, c.join_mode, c.profile
  from churches c where c.id = public.current_church_id();
end;
$$;

revoke all on function public.church_admin_info() from public, anon;
grant execute on function public.church_admin_info() to authenticated;

create or replace function public.set_church_join_mode(p_join_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  update churches set join_mode = case when p_join_mode = 'approval' then 'approval' else 'open' end
  where id = public.current_church_id();
end;
$$;

revoke all on function public.set_church_join_mode(text) from public, anon;
grant execute on function public.set_church_join_mode(text) to authenticated;

create or replace function public.church_join_requests()
returns table (user_id uuid, full_name text, avatar_url text, email text, asked_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  return query
  select m.user_id, p.full_name, p.avatar_url, p.email, m.joined_at
  from church_members m
  left join profiles p on p.id = m.user_id
  where m.church_id = public.current_church_id() and m.status = 'pending'
  order by m.joined_at;
end;
$$;

revoke all on function public.church_join_requests() from public, anon;
grant execute on function public.church_join_requests() to authenticated;

create or replace function public.answer_join_request(p_user uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admins only';
  end if;
  if p_accept then
    update church_members set status = 'active', joined_at = now()
    where church_id = public.current_church_id() and user_id = p_user and status = 'pending';
  else
    delete from church_members
    where church_id = public.current_church_id() and user_id = p_user and status = 'pending';
  end if;
end;
$$;

revoke all on function public.answer_join_request(uuid, boolean) from public, anon;
grant execute on function public.answer_join_request(uuid, boolean) to authenticated;

drop policy if exists "People upload church logos to their own folder" on storage.objects;
create policy "People upload church logos to their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'church-logos' and (storage.foldername(name))[1] = auth.uid()::text);