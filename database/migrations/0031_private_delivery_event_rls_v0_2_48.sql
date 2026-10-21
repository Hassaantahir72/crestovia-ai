-- Crestovia AI v0.2.48: make the webhook event ledger explicitly deny browser-role access.
-- service_role remains the only role with grants for this private table.
drop policy if exists "deny browser access to email delivery events" on public.email_delivery_events;
create policy "deny browser access to email delivery events"
  on public.email_delivery_events
  for all
  to anon, authenticated
  using (false)
  with check (false);
