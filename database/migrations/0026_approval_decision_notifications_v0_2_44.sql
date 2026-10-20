-- Crestovia AI v0.2.44: allow the reviewing owner to notify the requester of a recorded decision.
drop policy if exists "owners notify approval requesters" on public.notifications;
create policy "owners notify approval requesters" on public.notifications
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and type = 'approval_reviewed'
    and entity_type = 'approval_request'
    and dedupe_key = 'approval_reviewed:' || entity_id::text
    and exists (
      select 1
      from public.action_approval_requests r
      where r.id = notifications.entity_id
        and r.organization_id = notifications.organization_id
        and r.requested_by = notifications.recipient_id
        and r.reviewed_by = (select auth.uid())
        and r.status in ('approved', 'rejected')
        and notifications.body = r.summary
        and notifications.title = case
          when r.status = 'approved' then 'Your approval request was approved'
          else 'Your approval request was rejected'
        end
    )
  );
