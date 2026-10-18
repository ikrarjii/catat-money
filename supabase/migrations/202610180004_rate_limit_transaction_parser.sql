create table if not exists public.parse_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, window_start)
);

alter table public.parse_rate_limits enable row level security;
revoke all on public.parse_rate_limits from anon, authenticated;
grant all on public.parse_rate_limits to service_role;

create or replace function public.consume_parse_rate_limit(
  p_user_id uuid,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_limit < 1 or p_limit > 100 or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid rate limit settings';
  end if;

  v_window_start := pg_catalog.to_timestamp(
    floor(extract(epoch from pg_catalog.clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.parse_rate_limits (user_id, window_start, request_count)
  values (p_user_id, v_window_start, 1)
  on conflict (user_id, window_start)
  do update set request_count = public.parse_rate_limits.request_count + 1
  returning request_count into v_request_count;

  delete from public.parse_rate_limits
  where user_id = p_user_id and window_start < v_window_start - interval '1 hour';

  return v_request_count <= p_limit;
end;
$$;

revoke all on function public.consume_parse_rate_limit(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_parse_rate_limit(uuid, integer, integer) to service_role;
