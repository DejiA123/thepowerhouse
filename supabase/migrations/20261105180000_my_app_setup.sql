-- "You're nearly set up" after joining a group from a link: has this person already
-- used the app from a Home Screen on this kind of phone, and are notifications on?
-- On iPhone a link opens Safari, which can't see the Home Screen app's storage, so
-- the answer comes from their own account (the app's visits say "iPhone · app";
-- iPhones only get notifications through the Home Screen app). Only about yourself.
-- Safe to run again.
create or replace function public.my_app_setup(_device text)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'home_screen', auth.uid() is not null and _device in ('iPhone', 'iPad', 'Android', 'Computer') and exists (
      select 1 from public.app_activity a
       where a.user_id = auth.uid() and a.device = _device || ' · app'
    ),
    'notifications', auth.uid() is not null and exists (
      select 1 from public.push_subscriptions s
       where s.user_id = auth.uid()
         and (_device not in ('iPhone', 'iPad') or s.user_agent ilike '%' || _device || '%')
    )
  );
$$;
revoke all on function public.my_app_setup(text) from public, anon;
grant execute on function public.my_app_setup(text) to authenticated;
