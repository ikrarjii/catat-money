create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  type text not null check (type in ('INCOME', 'EXPENSE')),
  icon text not null default '🏷️',
  color text not null default '#21b596' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_user_type_name_unique
  on public.categories (user_id, type, lower(name));
create index if not exists categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

drop policy if exists "Users can read own categories" on public.categories;
create policy "Users can read own categories"
  on public.categories for select using (user_id = (select auth.uid()));
drop policy if exists "Users can create own categories" on public.categories;
create policy "Users can create own categories"
  on public.categories for insert with check (user_id = (select auth.uid()));
drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories"
  on public.categories for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories"
  on public.categories for delete using (user_id = (select auth.uid()));

create or replace function public.set_categories_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
for each row execute function public.set_categories_updated_at();
