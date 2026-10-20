-- Crestovia AI v0.2.46: private, idempotency-keyed transactional email delivery ledger.
create table public.email_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  approval_request_id uuid not null unique references public.action_approval_requests(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  sent_by uuid not null references auth.users(id) on delete restrict,
  recipient_email text not null check (length(trim(recipient_email)) between 3 and 254),
  subject text not null check (length(trim(subject)) between 1 and 180),
  status text not null default 'sending' check (status in ('sending','sent','failed')),
  attempts integer not null default 1 check (attempts between 1 and 3),
  provider_message_id text,
  last_error_code text check (last_error_code is null or length(last_error_code) <= 80),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_delivery_attempts_org_created_idx
  on public.email_delivery_attempts (organization_id, created_at desc);
alter table public.email_delivery_attempts enable row level security;
revoke all on table public.email_delivery_attempts from anon, authenticated;
grant select on table public.email_delivery_attempts to authenticated;
create policy "owners read organization email delivery attempts"
  on public.email_delivery_attempts for select to authenticated
  using (
    exists (
      select 1 from public.memberships m
      where m.organization_id = email_delivery_attempts.organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = 'owner'
    )
  );
-- All writes use the server-only service-role client after owner/MFA and
-- approved-request checks in the application; browser roles have no write grants.
