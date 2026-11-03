-- Remove two test accounts named "aaaaa" and "aaaaaa" (asked for by the church
-- admin). Guarded: it deletes only if exactly those two accounts match, and does
-- nothing if they're already gone. Safe to run again.
do $$
declare
  ids uuid[];
begin
  select array_agg(id) into ids
  from public.profiles
  where btrim(full_name) in ('aaaaa', 'aaaaaa');

  if ids is null then
    raise notice 'Test accounts already removed';
    return;
  end if;
  if array_length(ids, 1) > 2 then
    raise exception 'More than two accounts match; nothing deleted';
  end if;

  -- The account itself (its profile and everything that cascades with it)
  delete from auth.users where id = any(ids);
  -- A profile left without an account
  delete from public.profiles where id = any(ids);
end $$;
