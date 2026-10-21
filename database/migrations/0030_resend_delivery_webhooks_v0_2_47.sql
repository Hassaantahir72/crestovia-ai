-- Crestovia AI v0.2.47: idempotent, signature-verified Resend delivery status events.
alter table public.email_delivery_attempts
  drop constraint if exists email_delivery_attempts_status_check;
alter table public.email_delivery_attempts
  add constraint email_delivery_attempts_status_check
  check (status in ('sending','sent','failed','delivered','bounced','complained'));

create table public.email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique check (length(provider_event_id) between 1 and 200),
  provider_event_type text not null check (provider_event_type in ('email.delivered','email.bounced','email.complained')),
  provider_message_id text not null check (length(provider_message_id) between 1 and 200),
  outcome text not null check (outcome in ('processed','unmatched')),
  received_at timestamptz not null default now()
);
alter table public.email_delivery_events enable row level security;
revoke all on table public.email_delivery_events from public, anon, authenticated;
grant select, insert, update, delete on table public.email_delivery_events to service_role;

create or replace function public.apply_resend_delivery_event(
  p_event_id text,
  p_event_type text,
  p_provider_message_id text,
  p_status text
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inserted_id uuid;
  v_outcome text := 'unmatched';
begin
  if p_event_id is null or length(p_event_id) not between 1 and 200
     or p_provider_message_id is null or length(p_provider_message_id) not between 1 and 200
     or p_event_type not in ('email.delivered','email.bounced','email.complained')
     or p_status not in ('delivered','bounced','complained') then
    raise exception 'invalid_resend_delivery_event';
  end if;

  insert into public.email_delivery_events(provider_event_id, provider_event_type, provider_message_id, outcome)
  values (p_event_id, p_event_type, p_provider_message_id, 'unmatched')
  on conflict (provider_event_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then return 'duplicate'; end if;

  update public.email_delivery_attempts
  set status = case
        when p_status = 'complained' then 'complained'
        when status = 'complained' then 'complained'
        when status = 'bounced' then 'bounced'
        when p_status = 'bounced' then 'bounced'
        when p_status = 'delivered' then 'delivered'
        else status
      end,
      updated_at = now()
  where provider_message_id = p_provider_message_id
    and status in ('sent','delivered','bounced','complained');

  if found then
    v_outcome := 'processed';
    update public.email_delivery_events set outcome = v_outcome where id = v_inserted_id;
  end if;
  return v_outcome;
end;
$$;

revoke all on function public.apply_resend_delivery_event(text,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_resend_delivery_event(text,text,text,text) to service_role;
