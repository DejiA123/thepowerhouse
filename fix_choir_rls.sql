-- Migration to fix RLS policies for Choir App tables
-- Run this in your Supabase SQL Editor

-- 1. Policies for choir_setlist_info
alter table choir_setlist_info enable row level security;

-- Drop existing policies to ensure clean state
drop policy if exists "Enable read access for all users" on "public"."choir_setlist_info";
drop policy if exists "Enable insert for authenticated users only" on "public"."choir_setlist_info";
drop policy if exists "Enable update for authenticated users only" on "public"."choir_setlist_info";

-- Allow everyone to read (so choir members can see the setlist)
create policy "Enable read access for all users"
on "public"."choir_setlist_info"
for select
using (true);

-- Allow authenticated users (e.g. choir leads) to insert/update
create policy "Enable insert for authenticated users only"
on "public"."choir_setlist_info"
for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on "public"."choir_setlist_info"
for update
using (auth.role() = 'authenticated');

-- 2. Policies for choir_weekly_set_songs (if you plan to use it later or for incomplete references)
alter table choir_weekly_set_songs enable row level security;

drop policy if exists "Enable read access for all users" on "public"."choir_weekly_set_songs";
drop policy if exists "Enable insert for authenticated users only" on "public"."choir_weekly_set_songs";
drop policy if exists "Enable update for authenticated users only" on "public"."choir_weekly_set_songs";
drop policy if exists "Enable delete for authenticated users only" on "public"."choir_weekly_set_songs";

create policy "Enable read access for all users"
on "public"."choir_weekly_set_songs"
for select
using (true);

create policy "Enable insert for authenticated users only"
on "public"."choir_weekly_set_songs"
for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on "public"."choir_weekly_set_songs"
for update
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on "public"."choir_weekly_set_songs"
for delete
using (auth.role() = 'authenticated');
