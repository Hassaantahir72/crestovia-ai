-- Crestovia AI v0.2.52: atomic server-side rate limits for authenticated AI actions.
-- The ledger is private to service_role; browser roles cannot read or mutate counters.
create table public.user_rate_limit_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (char_length(bucket) between 1 and 80),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket)
);

alter table public.user_rate_limit_buckets enable row level security;
revoke all privileges on table public.user_rate_limit_buckets from public, anon, authenticated;
create policy "deny browser access to user rate limit buckets"
  on public.user_rate_limit_buckets
  for all
  to anon, authenticated
  using (false)
  with check (false);
grant select, insert, update, delete on table public.user_rate_limit_buckets to service_role;

create or replace function public.consume_user_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_user_id is null
    or p_bucket is null
    or char_length(p_bucket) not between 1 and 80
    or p_limit is null
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds is null
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into public.user_rate_limit_buckets (
    user_id, bucket, window_started_at, request_count, updated_at
  ) values (
    p_user_id, p_bucket, v_window_start, 1, v_now
  )
  on conflict (user_id, bucket) do update
  set window_started_at = case
        when public.user_rate_limit_buckets.window_started_at < excluded.window_started_at
          then excluded.window_started_at
        else public.user_rate_limit_buckets.window_started_at
      end,
      request_count = case
        when public.user_rate_limit_buckets.window_started_at < excluded.window_started_at
          then 1
        else least(public.user_rate_limit_buckets.request_count + 1, p_limit + 1)
      end,
      updated_at = excluded.updated_at
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_user_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_user_rate_limit(uuid, text, integer, integer) to service_role;
