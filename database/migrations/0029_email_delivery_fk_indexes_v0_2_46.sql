-- Crestovia AI v0.2.46 follow-up: index email delivery actor foreign keys.
create index if not exists email_delivery_attempts_requested_by_idx
  on public.email_delivery_attempts (requested_by);
create index if not exists email_delivery_attempts_sent_by_idx
  on public.email_delivery_attempts (sent_by);
