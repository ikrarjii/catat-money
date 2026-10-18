create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_name text not null check (char_length(trim(category_name)) between 1 and 40),
  amount_limit numeric(18, 2) not null check (amount_limit > 0),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz not null default now(),
  unique (user_id, category_name, month)
);

create index if not exists budgets_user_month_idx
  on public.budgets (user_id, month);

alter table public.budgets enable row level security;

drop policy if exists "Users can read own budgets" on public.budgets;
create policy "Users can read own budgets"
  on public.budgets for select
  using (user_id = (select auth.uid()));

drop policy if exists "Users can create own budgets" on public.budgets;
create policy "Users can create own budgets"
  on public.budgets for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own budgets" on public.budgets;
create policy "Users can update own budgets"
  on public.budgets for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can delete own budgets"
  on public.budgets for delete
  using (user_id = (select auth.uid()));
