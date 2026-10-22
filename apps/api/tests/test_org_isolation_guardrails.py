from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def read_web(path: str) -> str:
    return (WEB / path).read_text(encoding="utf-8")


def test_read_only_assistant_workspace_queries_are_organization_scoped():
    tools = read_web("lib/ai/workspace-tools.ts")
    assert tools.count('.eq("organization_id", organizationId)') == 4
    assert '.eq("assigned_to", userId)' in tools
    assert "READ_ONLY_TOOL_REGISTRY.filter" in tools
    assert ".limit(100)" in tools
    assert ".limit(40)" in tools
    assert ".limit(20)" in tools
    for write_method in (".insert(", ".update(", ".delete(", ".upsert("):
        assert write_method not in tools


def test_notification_mutations_bind_recipient_and_active_organization():
    actions = read_web("app/dashboard/notifications/actions.ts")
    assert '.eq("recipient_id",user.id)' in actions
    assert '.eq("organization_id",membership.organization_id)' in actions
    assert "export async function markNotificationRead" in actions
    assert "export async function markAllNotificationsRead" in actions


def test_approval_execution_passes_active_organization_to_atomic_rpc():
    actions = read_web("app/dashboard/actions.ts")
    start = actions.index("export async function executeApprovedTaskRequest")
    executor = actions[start:]
    assert 'p_organization_id:membership.organization_id' in executor
    assert 'supabase.rpc("execute_approved_task_request"' in executor
    assert '.from("tasks").insert(' not in executor


def test_tenant_isolation_acceptance_runbook_covers_direct_api_and_cross_org_negative_cases():
    runbook = (ROOT / "docs" / "security" / "TENANT_ISOLATION_ACCEPTANCE.md").read_text(encoding="utf-8").lower()

    for required in (
        "direct server/api calls",
        "cross-organization read",
        "cross-organization mutation",
        "suspended membership",
        "stale organization context",
        "approval execution",
        "effective table, sequence, schema, function, and default-acl privileges",
        "does not mark the tenant-isolation gate complete",
    ):
        assert required in runbook
