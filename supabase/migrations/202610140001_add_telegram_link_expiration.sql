alter table public.users
  add column if not exists link_token_expires_at timestamptz;

create policy "Users can create own profile"
  on public.users for insert
  with check (id = (select auth.uid()));
