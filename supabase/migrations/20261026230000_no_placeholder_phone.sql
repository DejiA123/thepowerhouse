-- New accounts were given the placeholder phone number "+234 123 456 7890"
-- (a Nigerian number nobody entered). No default from now on, and the
-- placeholder is cleared from profiles that still have it.
alter table public.profiles alter column phone drop default;

update public.profiles
set phone = null
where phone = '+234 123 456 7890';
