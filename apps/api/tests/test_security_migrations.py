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


def test_rls_policy_consolidation_preserves_scoped_access_and_removes_overlaps():
    sql = compact_sql("0019_consolidate_permissive_rls_policies.sql")

    # Departments and project assignments retain owner writes while SELECT remains scoped.
    assert 'drop policy if exists "only owner manages departments"' in sql
    assert 'create policy "owners insert departments"' in sql
    assert 'create policy "owners update departments"' in sql
    assert 'create policy "owners delete departments"' in sql
    assert 'drop policy if exists "organization owners manage project assignments"' in sql
    assert 'create policy "owners insert project assignments"' in sql
    assert 'create policy "owners update project assignments"' in sql
    assert 'create policy "owners delete project assignments"' in sql

    # Bootstrap membership creation remains restricted to the authenticated creator.
    assert 'create policy "owners or creators insert memberships"' in sql
    assert "user_id = (select auth.uid())" in sql
    assert "role = 'owner'" in sql
    assert "status = 'active'" in sql
    assert "o.created_by = (select auth.uid())" in sql
    assert 'create policy "organization owners update memberships"' in sql
    assert 'create policy "organization owners delete memberships"' in sql

    # Organization reads preserve all three original relationship cases in one policy.
    assert 'drop policy if exists "creators read own organizations during bootstrap"' in sql
    assert 'drop policy if exists "invitees can read invited organizations"' in sql
    assert 'drop policy if exists "members can read their organizations"' in sql
    assert 'create policy "users read organizations by relationship"' in sql
    assert "created_by = (select auth.uid())" in sql
    assert "m.status = 'invited'" in sql
    assert "m.status = 'active'" in sql
    assert "for all to authenticated" not in sql
    assert "drop table" not in sql


def test_membership_bootstrap_policy_hotfix_removes_duplicate_insert_policy():
    sql = compact_sql("0020_remove_duplicate_membership_bootstrap_policy.sql")

    assert 'drop policy if exists "users bootstrap their own owner membership" on public.memberships' in sql
    assert "drop table" not in sql


def test_assistant_queries_explicitly_scope_private_records_to_signed_in_user():
    actions = (ROOT / "apps" / "web" / "app" / "dashboard" / "assistant" / "actions.ts").read_text(encoding="utf-8")
    page = (ROOT / "apps" / "web" / "app" / "dashboard" / "assistant" / "page.tsx").read_text(encoding="utf-8")

    # RLS remains the primary boundary; explicit filters provide defense in depth.
    assert '.from("assistant_conversations").select("id,title").eq("id",id).eq("user_id",user.id)' in actions
    assert '.from("assistant_messages").select("role,content").eq("conversation_id",id).eq("user_id",user.id)' in actions
    assert '.from("assistant_memories").select("category,title,content").eq("user_id",user.id)' in actions
    assert '.from("assistant_conversations").select("id,title,updated_at").eq("user_id",user.id)' in page
    assert '.from("assistant_messages").select("id,role,content,created_at").eq("conversation_id",active.id).eq("user_id",user.id)' in page


def test_notification_table_rls_and_task_reminder_indexes_are_scoped():
    sql = compact_sql("0024_in_app_notifications_v0_2_42.sql")

    assert "create table if not exists public.notifications" in sql
    assert "enable row level security" in sql
    assert "recipient_id = (select auth.uid())" in sql
    assert "grant select, insert on public.notifications to authenticated" in sql
    assert "grant update (read_at) on public.notifications to authenticated" in sql
    assert "dedupe_key = 'task_assigned:' || entity_id::text || ':' || recipient_id::text" in sql
    assert "on conflict (dedupe_key) do nothing" in sql or "dedupe_key text not null unique" in sql
    assert "task_assigned" in sql
    assert "create index if not exists notifications_recipient_created_idx" in sql
    assert "drop table" not in sql


def test_notification_creator_foreign_key_has_covering_index():
    sql = compact_sql("0025_notification_created_by_index_v0_2_43.sql")
    assert "create index if not exists notifications_created_by_idx on public.notifications(created_by)" in sql
    assert "drop index" not in sql


def test_approval_decision_notification_insert_is_bound_to_reviewed_request():
    sql = compact_sql("0026_approval_decision_notifications_v0_2_44.sql")
    assert 'create policy "owners notify approval requesters"' in sql
    assert "type = 'approval_reviewed'" in sql
    assert "entity_type = 'approval_request'" in sql
    assert "requested_by = notifications.recipient_id" in sql
    assert "reviewed_by = (select auth.uid())" in sql
    assert "status in ('approved', 'rejected')" in sql


def test_notification_insert_policies_are_consolidated_and_scoped():
    sql = compact_sql("0027_consolidate_notification_insert_policy_v0_2_45.sql")
    assert 'drop policy if exists "task creators notify assigned members"' in sql
    assert 'drop policy if exists "owners notify approval requesters"' in sql
    assert 'create policy "scoped notification inserts"' in sql
    assert "type = 'task_assigned'" in sql
    assert "type = 'approval_reviewed'" in sql
    assert "app_private.is_org_owner(r.organization_id)" in sql
    assert "recipient_id <> (select auth.uid())" in sql


def test_public_anon_privileges_are_revoked_and_authenticated_admin_privileges_are_limited():
    sql = compact_sql("0034_revoke_anon_public_privileges.sql")

    assert "revoke all privileges on all tables in schema public from anon" in sql
    assert "revoke all privileges on all sequences in schema public from anon" in sql
    assert "revoke execute on all functions in schema public from anon" in sql
    assert "revoke truncate, references, trigger, maintain on all tables in schema public from authenticated" in sql
    for owner_role in ("postgres", "supabase_admin"):
        assert f"alter default privileges for role {owner_role} in schema public revoke all on tables from anon" in sql
        assert f"alter default privileges for role {owner_role} in schema public revoke execute on functions from anon" in sql
        assert f"alter default privileges for role {owner_role} in schema public revoke execute on functions from authenticated" in sql
        assert f"alter default privileges for role {owner_role} in schema public revoke usage, select on sequences from anon" in sql
        assert f"alter default privileges for role {owner_role} in schema public revoke truncate, references, trigger, maintain on tables from authenticated" in sql
    assert "drop table" not in sql
    assert "delete from" not in sql
