# Resend webhook retry and reconciliation

Crestovia AI v0.2.56 makes unmatched Resend delivery events retryable.

## Why this is needed

A provider webhook can arrive before the email delivery row has its provider message ID. The webhook is recorded as `unmatched`. Previously, a later retry with the same provider event ID was treated as a duplicate and could never update the delivery row, even after the row became matchable.

## New behavior

- A first valid event is recorded and applied when a matching delivery row exists.
- An already processed event remains idempotent: repeats return `duplicate` without reapplying it.
- An event previously recorded as `unmatched` is checked again on retry. If the matching delivery row now exists, the ledger is updated and the RPC returns `reprocessed`.
- If it still cannot be matched, the event remains `unmatched` and can be retried again.
- Event rows are locked while duplicate/unmatched state is reconciled, preventing concurrent retries from racing the same event.
- Signature verification, five-minute clock-skew validation, body-size bounds, status precedence, RLS, and service-role-only RPC execution remain in place.

## Database rollout

Apply `database/migrations/0033_retry_unmatched_resend_events_v0_2_56.sql` after migration 0030. The migration replaces the existing function in place and preserves its owner and existing grants; it creates no new tables or secrets. Confirm the function definition and service-role-only EXECUTE permissions in Supabase before relying on retry reconciliation.

## Acceptance tests still needed

Use a private test sender and real Resend webhook configuration to verify: unmatched event, ledger row becomes matchable, same event ID retried, status updates; processed duplicate remains a no-op; invalid signatures and stale timestamps are rejected. Do not paste provider secrets into chat. Public deployment remains deferred.
