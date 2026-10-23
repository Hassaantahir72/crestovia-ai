from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASK_EXECUTOR = ROOT / "database/migrations/0023_approval_execution_org_scope_v0_2_41.sql"
REMINDER_RPC = ROOT / "database/migrations/0035_task_reminder_batch_dedupe_v0_2_94.sql"


def test_approved_task_executor_keeps_owner_org_and_approval_guards():
    sql = TASK_EXECUTOR.read_text(encoding="utf-8").lower()
    for required in (
        "security invoker",
        "set search_path = ''",
        "auth.uid()",
        "r.organization_id = p_organization_id",
        "m.organization_id = p_organization_id",
        "m.user_id = v_user_id",
        "m.status = 'active'",
        "m.role = 'owner'",
        "v_request.status <> 'approved'",
        "v_request.expires_at <= now()",
        "v_request.action_type <> 'create_task'",
        "v_request.execution_status <> 'pending'",
        "for update",
        "revoke all on function public.execute_approved_task_request(uuid, uuid) from public",
        "revoke all on function public.execute_approved_task_request(uuid, uuid) from anon",
        "grant execute on function public.execute_approved_task_request(uuid, uuid) to authenticated",
    ):
        assert required in sql, f"Missing approved-task security contract: {required}"


def test_reminder_rpc_is_bounded_deduplicated_and_service_role_only():
    sql = REMINDER_RPC.read_text(encoding="utf-8").lower()
    for required in (
        "security invoker",
        "limit least(greatest(coalesce(p_batch_size, 500), 1), 500)",
        "on conflict (dedupe_key) do nothing",
        "revoke all on function public.enqueue_due_task_reminders(timestamptz, timestamptz, date, integer)",
        "from public, anon, authenticated",
        "grant execute on function public.enqueue_due_task_reminders(timestamptz, timestamptz, date, integer)",
        "to service_role",
        "t.organization_id",
    ):
        assert required in sql, f"Missing reminder security contract: {required}"
