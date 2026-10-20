from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MIGRATIONS = ROOT / "database" / "migrations"


def compact_sql(path: str) -> str:
    """Normalize whitespace for resilient migration-invariant checks."""
    return re.sub(r"\s+", " ", (MIGRATIONS / path).read_text(encoding="utf-8").lower()).strip()


def test_audit_read_policy_is_scoped_to_active_org_owners_and_admins():
    sql = compact_sql("0014_audit_log_admin_read_access.sql")

    assert 'create policy "organization owners and admins read audit logs"' in sql
    assert "on public.audit_logs for select to authenticated using" in sql
    assert "m.organization_id = audit_logs.organization_id" in sql
    assert "m.user_id = (select auth.uid())" in sql
    assert "m.status = 'active'" in sql
    assert "m.role in ('owner', 'admin')" in sql


def test_audit_table_browser_grants_are_read_only():
    sql = compact_sql("0015_audit_logs_browser_read_only.sql")

    assert "revoke all privileges on table public.audit_logs from anon, authenticated" in sql
    assert "grant select on table public.audit_logs to authenticated" in sql
    assert not re.search(r"grant\s+(?:insert|update|delete|all)\b", sql)


def test_audit_privilege_hardening_migrations_are_ordered():
    migration_files = sorted(path.name for path in MIGRATIONS.glob("*.sql"))
    assert "0014_audit_log_admin_read_access.sql" in migration_files
    assert "0015_audit_logs_browser_read_only.sql" in migration_files
    assert migration_files.index("0014_audit_log_admin_read_access.sql") < migration_files.index(
        "0015_audit_logs_browser_read_only.sql"
    )

def test_email_mfa_issuance_is_serialized_and_service_role_only():
    sql = compact_sql("0016_atomic_email_mfa_challenge_issuance.sql")
    route = (ROOT / "apps" / "web" / "app" / "api" / "security" / "email-mfa" / "request" / "route.ts").read_text(
        encoding="utf-8"
    )

    assert "pg_advisory_xact_lock" in sql
    assert "hashtextextended(p_user_id::text, 0)" in sql
    assert "v_recent_count >= 5" in sql
    assert "interval '60 seconds'" in sql
    assert "security invoker" in sql
    assert "from public, anon, authenticated" in sql
    assert "to service_role" in sql
    assert 'admin.rpc("issue_email_mfa_challenge"' in route
    assert "recentChallenges" not in route

def test_email_mfa_failed_attempt_rpc_is_atomic_and_service_role_only():
    sql = compact_sql("0017_atomic_email_mfa_failed_attempts.sql")
    route = (ROOT / "apps" / "web" / "app" / "api" / "security" / "email-mfa" / "verify" / "route.ts").read_text(
        encoding="utf-8"
    )

    assert "create or replace function public.record_email_mfa_failed_attempt" in sql
    assert "security invoker" in sql
    assert "set search_path = ''" in sql
    assert "attempt_count = c.attempt_count + 1" in sql
    assert "c.attempt_count < 5" in sql
    assert "when c.attempt_count + 1 >= 5" in sql
    assert "from public, anon, authenticated" in sql
    assert "to service_role" in sql
    assert 'admin.rpc("record_email_mfa_failed_attempt"' in route
    assert "challenge.attempt_count+1" not in route

def test_foreign_key_lookup_indexes_cover_advisor_findings():
    sql = compact_sql("0018_foreign_key_lookup_indexes.sql")

    expected_indexes = [
        "action_approval_requests_org_requested_by_idx",
        "action_approval_requests_reviewed_by_idx",
        "assistant_messages_conversation_user_idx",
        "assistant_messages_user_id_idx",
        "audit_logs_actor_id_idx",
        "departments_created_by_idx",
        "organization_invitations_invited_by_idx",
        "organizations_created_by_idx",
        "project_memberships_assigned_by_idx",
        "project_memberships_org_user_idx",
        "projects_created_by_idx",
        "projects_org_department_idx",
        "task_comments_org_task_idx",
        "task_comments_author_id_idx",
        "task_comments_organization_id_idx",
        "tasks_org_assignee_idx",
        "tasks_created_by_idx",
        "tasks_org_project_idx",
        "workspace_activity_actor_id_idx",
    ]

    for index_name in expected_indexes:
        assert f"create index if not exists {index_name}" in sql

    assert "drop index" not in sql
    assert "drop table" not in sql
