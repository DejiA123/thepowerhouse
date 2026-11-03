-- Profiles: "About" starts empty (no "Jesus is Lord 🙏" for everyone), and a
-- phone number is private unless its owner chooses to show it. The phone column
-- can't be read directly any more; the app reads it through my_phone() (my own)
-- and profile_phone() (someone else's, only if they show it). Safe to run again.

-- About: no default text; the default nobody wrote is cleared
alter table public.profiles alter column bio drop default;
update public.profiles set bio = null where bio = 'Jesus is Lord 🙏';

-- Show my phone number to others? Off unless I turn it on
alter table public.profiles add column if not exists phone_visible boolean not null default false;

-- Every column except the phone can be read as before (by those who could read profiles)
do $$
declare
  cols text;
  r text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name <> 'phone';
  foreach r in array array['anon', 'authenticated'] loop
    if has_table_privilege(r, 'public.profiles', 'SELECT') then
      execute format('revoke select on public.profiles from %I', r);
      execute format('grant select (%s) on public.profiles to %I', cols, r);
    end if;
  end loop;
end $$;

create or replace function public.my_phone()
returns table (phone text, phone_visible boolean)
language sql stable security definer set search_path = public
as $$
  select p.phone, p.phone_visible from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.set_my_phone(_phone text, _visible boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.profiles
     set phone = nullif(btrim(coalesce(_phone, '')), ''),
         phone_visible = coalesce(_visible, false),
         updated_at = now()
   where id = auth.uid();
end;
$$;

-- Someone's phone number, only if they chose to show it (or it's mine)
create or replace function public.profile_phone(_user_id uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select p.phone from public.profiles p
  where p.id = _user_id and auth.uid() is not null and (p.phone_visible or p.id = auth.uid());
$$;

revoke all on function public.my_phone() from public, anon;
revoke all on function public.set_my_phone(text, boolean) from public, anon;
revoke all on function public.profile_phone(uuid) from public, anon;
grant execute on function public.my_phone() to authenticated;
grant execute on function public.set_my_phone(text, boolean) to authenticated;
grant execute on function public.profile_phone(uuid) to authenticated;
