-- Serialize email-MFA challenge issuance per user so parallel requests cannot bypass
-- the hourly limit or resend cooldown. This is an invoker function and is callable
-- only by the server-side service_role.
create or replace function public.issue_email_mfa_challenge(
  p_user_id uuid,
  p_session_id text,
  p_email_to text,
  p_code_hash text,
  p_expires_at timestamptz
)
returns table(outcome text, challenge_id uuid, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recent_count integer;
  v_latest timestamptz;
  v_now timestamptz;
  v_challenge_id uuid;
begin
  if p_user_id is null
    or p_session_id is null or p_session_id = ''
    or p_email_to is null or p_email_to = ''
    or p_code_hash is null or p_code_hash = ''
    or p_expires_at is null then
    raise exception 'Invalid email MFA challenge arguments';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );
  v_now := pg_catalog.clock_timestamp();

  select count(*)::integer, max(c.created_at)
    into v_recent_count, v_latest
  from public.email_mfa_challenges as c
  where c.user_id = p_user_id
    and c.created_at >= v_now - interval '1 hour';

  if v_recent_count >= 5 then
    return query select 'hourly_rate_limit'::text, null::uuid, null::integer;
    return;
  end if;

  if v_latest is not null and v_latest > v_now - interval '60 seconds' then
    return query select
      'resend_cooldown'::text,
      null::uuid,
      greatest(1, ceil(extract(epoch from (v_latest + interval '60 seconds' - v_now)))::integer);
    return;
  end if;

  update public.email_mfa_challenges as c
  set used_at = v_now
  where c.user_id = p_user_id
    and c.session_id = p_session_id
    and c.used_at is null;

  insert into public.email_mfa_challenges (
    user_id, session_id, email_to, code_hash, expires_at, attempt_count, created_at
  ) values (
    p_user_id, p_session_id, p_email_to, p_code_hash, p_expires_at, 0, v_now
  )
  returning id into v_challenge_id;

  return query select 'issued'::text, v_challenge_id, 0;
end;
$$;

revoke all on function public.issue_email_mfa_challenge(uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.issue_email_mfa_challenge(uuid, text, text, text, timestamptz)
  to service_role;
