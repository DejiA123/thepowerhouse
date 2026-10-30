-- The Power House has one church admin: Ayodeji Augustine (dejiaugustine@gmail.com).
-- Church admin = an active 'administrator' or 'pastor' role (see is_admin), so every
-- other such role in The Power House is switched off (kept, not deleted, so it can be
-- given back from Admin → roles). Other churches on Church Space keep their own admins.
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
