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
  where (find_id is not null and c.id = find_id)
     or (find_id is null and find_slug is not null and c.slug = lower(find_slug))
  limit 1
$$;

drop policy if exists "Anyone can find a church" on public.churches;
revoke all on public.churches from anon, authenticated;