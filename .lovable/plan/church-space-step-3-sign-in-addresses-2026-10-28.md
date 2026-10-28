# Church Space step 3 + sign-in addresses

## What it does
- Lets people find a church (by name, town, link or join code), join it (straight in or waiting for approval), and create their own church space (they become its admin).
- Church admins can see their join code, switch between "open" and "approval", and accept or turn down people waiting.
- Adds a public "church-logos" storage area (1 MB max, PNG/JPEG/WebP); people can only upload into their own folder.
- The Power House's own address keeps working as before.

## Steps
1. Apply the migration file as written, except the one line that creates the "church-logos" storage area — that line isn't allowed in migrations, so I'll create the same storage area (public, 1 MB, PNG/JPEG/WebP) with the storage tool first, then run the rest unchanged.
2. Check: the new functions exist, the roles rule now allows the same role in different churches, existing members are untouched, and the logo storage rule is in place. Fix any new security warnings this change causes.
3. Sign-in addresses: add `https://churchspaceapp.vercel.app` and `https://churchspaceapp.vercel.app/**` alongside the existing ones. If I can't change this setting from here (your database is on your own Supabase account), I'll give you the exact link and the two lines to paste in Authentication → URL Configuration.

## Not checked
- I won't sign up through the Church Space address to try a full join.
