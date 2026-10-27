alter table public.profiles alter column phone drop default;

update public.profiles
set phone = null
where phone = '+234 123 456 7890';