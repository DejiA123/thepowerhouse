do $$
declare
  power_house constant uuid := '7a1c0de5-0000-4000-8000-000000000001';
  owner uuid;
begin
  select id into owner from auth.users where lower(email) = 'dejiaugustine@gmail.com' limit 1;
  if owner is null then
    raise notice 'No account for dejiaugustine@gmail.com: admin roles left as they are';
    return;
  end if;

  update public.user_roles
  set is_active = false
  where church_id = power_house
    and role in ('administrator', 'pastor')
    and user_id <> owner;

  insert into public.user_roles (user_id, role, church_id, is_active)
  values (owner, 'administrator', power_house, true)
  on conflict (user_id, role, church_id) do update set is_active = true;
end;
$$;