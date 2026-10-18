-- All public.users writes are performed by trusted server code using the
-- Supabase service role. Browser users only need to read their own row.
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can create own profile" on public.users;
