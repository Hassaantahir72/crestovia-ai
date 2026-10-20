-- Crestovia AI v0.2.45: consolidate notification insert authorization into one policy.
drop policy if exists "task creators notify assigned members" on public.notifications;
drop policy if exists "owners notify approval requesters" on public.notifications;

create policy "scoped notification inserts" on public.notifications
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and (
      (
        type = 'task_assigned'
        and entity_type = 'task'
        and dedupe_key = 'task_assigned:' || entity_id::text || ':' || recipient_id::text
        and title = 'A task was assigned to you'
        and exists (
          select 1 from public.memberships m
          where m.organization_id = notifications.organization_id
            and m.user_id = (select auth.uid())
            and m.status = 'active'
        )
        and exists (
          select 1 from public.tasks t
          where t.id = notifications.entity_id
            and t.organization_id = notifications.organization_id
            and t.assigned_to = notifications.recipient_id
            and notifications.body = t.title
            and (t.created_by = (select auth.uid()) or app_private.is_org_owner(t.organization_id))
        )
      )
      or
      (
        type = 'approval_reviewed'
        and entity_type = 'approval_request'
        and dedupe_key = 'approval_reviewed:' || entity_id::text
        and exists (
          select 1 from public.action_approval_requests r
          where r.id = notifications.entity_id
            and r.organization_id = notifications.organization_id
            and r.requested_by = notifications.recipient_id
            and r.reviewed_by = (select auth.uid())
            and r.status in ('approved', 'rejected')
            and app_private.is_org_owner(r.organization_id)
            and notifications.body = r.summary
            and notifications.title = case
              when r.status = 'approved' then 'Your approval request was approved'
              else 'Your approval request was rejected'
            end
        )
      )
    )
  );
