alter table public.transactions
  add column if not exists source text
  check (source in ('TELEGRAM', 'WEB'));

comment on column public.transactions.source is
  'Input channel for the transaction: TELEGRAM or WEB. Null means the channel was not recorded.';
