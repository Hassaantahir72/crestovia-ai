-- Crestovia AI v0.2.38: execution state and a narrowly scoped internal task action.
alter table public.action_approval_requests
  drop constraint if exists action_approval_requests_action_type_check;
alter table public.action_approval_requests
  add constraint action_approval_requests_action_type_check
  check (action_type in ('create_task','external_write','send_email','send_message','calendar_change','data_export','other'));

alter table public.action_approval_requests
  add column if not exists execution_status text not null default 'pending'
    check (execution_status in ('pending','running','succeeded','failed')),
  add column if not exists execution_started_at timestamptz,
  add column if not exists execution_completed_at timestamptz,
  add column if not exists execution_result text not null default ''
    check (length(execution_result) <= 1000);

create index if not exists action_approval_requests_execution_idx
  on public.action_approval_requests(organization_id, status, execution_status, expires_at);
