-- Crestovia AI v0.2.56: allow provider retries to reconcile previously unmatched delivery events.
-- Resend can deliver a webhook before the email ledger has stored provider_message_id.
-- If that event is retried after the ledger catches up, reprocess it instead of treating
-- the earlier unmatched receipt as a permanently completed duplicate.

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
  v_event_row_id uuid;
  v_existing_outcome text;
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
  returning id into v_event_row_id;

  if v_event_row_id is null then
    select id, outcome into v_event_row_id, v_existing_outcome
    from public.email_delivery_events
    where provider_event_id = p_event_id
    for update;

    if not found then
      raise exception 'resend_event_record_unavailable';
    end if;
    if v_existing_outcome = 'processed' then
      return 'duplicate';
    end if;
  end if;

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
    update public.email_delivery_events
    set outcome = 'processed'
    where id = v_event_row_id;
    if v_existing_outcome = 'unmatched' then
      return 'reprocessed';
    end if;
    return 'processed';
  end if;

  return 'unmatched';
end;
$$;

-- CREATE OR REPLACE preserves the existing function owner and service_role-only EXECUTE grant.
