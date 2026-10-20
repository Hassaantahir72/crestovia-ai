-- Atomically count each failed email-MFA verification, even under concurrent requests.
-- The service-only RPC serializes updates on the challenge row and locks it at five failures.
create or replace function public.record_email_mfa_failed_attempt(
  p_challenge_id uuid
)
returns table(outcome text, attempt_count integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempt_count integer;
begin
  if p_challenge_id is null then
    raise exception 'Invalid email MFA challenge id';
  end if;

  update public.email_mfa_challenges as c
  set
    attempt_count = c.attempt_count + 1,
    used_at = case
      when c.attempt_count + 1 >= 5 then pg_catalog.clock_timestamp()
      else c.used_at
    end
  where c.id = p_challenge_id
    and c.used_at is null
    and c.attempt_count < 5
  returning c.attempt_count into v_attempt_count;

  if found then
    return query
      select
        case when v_attempt_count >= 5 then 'locked' else 'incremented' end,
        v_attempt_count;
    return;
  end if;

  return query select 'unavailable'::text, null::integer;
end;
$$;

revoke all on function public.record_email_mfa_failed_attempt(uuid)
  from public, anon, authenticated;
grant execute on function public.record_email_mfa_failed_attempt(uuid)
  to service_role;
