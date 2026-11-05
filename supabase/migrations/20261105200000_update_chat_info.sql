-- Group admins change the group's photo, name and description, like WhatsApp. A
-- plain update of group_chats only works for whoever its own rules allow (others got
-- no error but nothing changed, so a new photo seemed to take and then went back);
-- this checks who's asking (`can_manage_chat`) and saves. Null leaves a field as it
-- is; an empty photo removes it. Safe to run again.
create or replace function public.update_chat_info(
  _chat_id uuid,
  _name text default null,
  _description text default null,
  _avatar_url text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_chat(_chat_id) then
    raise exception 'Only the group''s admins can change its info' using errcode = '42501';
  end if;
  if _name is not null and char_length(btrim(_name)) not between 1 and 100 then
    raise exception 'The group name must be 1–100 characters' using errcode = '22023';
  end if;
  if _description is not null and char_length(_description) > 500 then
    raise exception 'The description can be up to 500 characters' using errcode = '22023';
  end if;
  if _avatar_url is not null and _avatar_url <> '' and (_avatar_url !~ '^https://' or char_length(_avatar_url) > 1000) then
    raise exception 'That photo address isn''t allowed' using errcode = '22023';
  end if;
  update public.group_chats
     set name = coalesce(btrim(_name), name),
         description = coalesce(_description, description),
         avatar_url = case when _avatar_url is null then avatar_url when _avatar_url = '' then null else _avatar_url end
   where id = _chat_id;
end;
$$;
revoke all on function public.update_chat_info(uuid, text, text, text) from public, anon;
grant execute on function public.update_chat_info(uuid, text, text, text) to authenticated;
