-- Core schema for the Telegram + web finance tracker.
-- Run in the Supabase SQL editor or through Supabase migrations.

create extension if not exists pgcrypto;

create type public.transaction_type as enum ('INCOME', 'EXPENSE');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  password_hash text,
  telegram_chat_id text unique,
  link_token text unique,
  link_token_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(18, 2) not null check (amount > 0),
  category text not null,
  description text not null default '',
  date timestamptz not null,
  source text check (source in ('TELEGRAM', 'WEB')),
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index transactions_user_type_date_idx
  on public.transactions (user_id, type, date desc);

alter table public.users enable row level security;
alter table public.transactions enable row level security;

-- Supabase Auth owns identity. The users.id is the matching auth.users.id.
create policy "Users can read own profile"
  on public.users for select
  using (id = (select auth.uid()));

create policy "Users can read own transactions"
  on public.transactions for select
  using (user_id = (select auth.uid()));
create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (user_id = (select auth.uid()));
create policy "Users can update own transactions"
  on public.transactions for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can delete own transactions"
  on public.transactions for delete
  using (user_id = (select auth.uid()));

-- password_hash is intentionally nullable for Supabase Auth users. Do not store
-- Supabase passwords here; auth.users manages password hashes securely.
