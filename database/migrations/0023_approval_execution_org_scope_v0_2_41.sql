-- Crestovia AI v0.2.41: bind the transactional executor to the active organization.
drop function if exists public.execute_approved_task_request(uuid);

create function public.execute_approved_task_request(
  p_request_id uuid,
  p_organization_id uuid
)
returns table(approval_id uuid, task_id uuid)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request public.action_approval_requests%rowtype;
  v_task_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'owner_required';
  end if;

  select r.* into v_request
  from public.action_approval_requests as r
  where r.id = p_request_id
    and r.organization_id = p_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'request_not_found';
  end if;

  if not exists (
    select 1 from public.memberships as m
    where m.organization_id = p_organization_id
      and m.user_id = v_user_id
      and m.status = 'active'
      and m.role = 'owner'
  ) then
    raise exception using errcode = '42501', message = 'owner_required';
  end if;

  if v_request.status <> 'approved' then
    raise exception using errcode = 'P0001', message = 'request_not_approved';
  end if;

  if v_request.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'request_expired';
  end if;

  if v_request.action_type <> 'create_task' then
    raise exception using errcode = 'P0001', message = 'unsupported_action';
  end if;

  if v_request.execution_status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'execution_already_started';
  end if;

  update public.action_approval_requests as r
  set execution_status = 'running',
      execution_started_at = now(),
      execution_result = 'Execution started.'
  where r.id = v_request.id
    and r.organization_id = p_organization_id;

  insert into public.tasks (
    organization_id, title, description, priority, created_by
  ) values (
    p_organization_id, v_request.summary, v_request.details, 'medium', v_user_id
  ) returning id into v_task_id;

  update public.action_approval_requests as r
  set execution_status = 'succeeded',
      execution_completed_at = now(),
      execution_result = 'Created workspace task ' || v_task_id::text || '.'
  where r.id = v_request.id
    and r.organization_id = p_organization_id;

  return query select v_request.id, v_task_id;
end;
$function$;

revoke all on function public.execute_approved_task_request(uuid, uuid) from public;
revoke all on function public.execute_approved_task_request(uuid, uuid) from anon;
revoke all on function public.execute_approved_task_request(uuid, uuid) from authenticated;
grant execute on function public.execute_approved_task_request(uuid, uuid) to authenticated;
