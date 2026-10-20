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

def test_email_mfa_failed_attempts_use_compare_and_set():
    route = (ROOT / "apps" / "web" / "app" / "api" / "security" / "email-mfa" / "verify" / "route.ts").read_text(
        encoding="utf-8"
    )
    invalid_branch = route.split("if(!valid){", 1)[1].split("const {data:consumed", 1)[0]

    assert '.eq("attempt_count",challenge.attempt_count)' in invalid_branch
    assert '.is("used_at",null)' in invalid_branch
    assert '.select("id").maybeSingle()' in invalid_branch
    assert "if(!attemptUpdated)" in invalid_branch
    assert "challenge_already_used_or_updated" in invalid_branch
