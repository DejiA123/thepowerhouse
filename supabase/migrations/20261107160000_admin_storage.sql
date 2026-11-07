-- Me → Admin → Storage: how full the app's own file storage and database are (Supabase's
-- free plan: 1 GB of files, 500 MB of database). Church admins only. The media store
-- (Cloudflare R2) is totalled by the song-writer function's 'storage' action.
-- Safe to run again.

create or replace function public.admin_storage_usage()
returns json
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  _buckets json;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only church admins can see this';
  end if;
  select coalesce(json_agg(json_build_object('bucket', b.bucket_id, 'files', b.files, 'bytes', b.bytes) order by b.bytes desc), '[]'::json)
    into _buckets
  from (
    select o.bucket_id, count(*) as files, coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes
    from storage.objects o
    group by o.bucket_id
  ) b;
  return json_build_object('buckets', _buckets, 'database_bytes', pg_database_size(current_database()));
end;
$$;

revoke all on function public.admin_storage_usage() from public, anon;
grant execute on function public.admin_storage_usage() to authenticated;
