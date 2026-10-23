from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "database" / "audits" / "staging_security_audit.sql"


def test_staging_security_audit_is_read_only_and_checks_table_rls_and_grants():
    source = AUDIT.read_text(encoding="utf-8").lower()
    assert "pg_class" in source
    assert "relrowsecurity" in source
    assert "has_table_privilege('anon'" in source
    assert "has_table_privilege('authenticated'" in source
    assert "has_schema_privilege('anon', 'public', 'usage')" in source
    assert "has_function_privilege('anon'" in source
    assert "insert into " not in source
    assert "update " not in source
    assert "delete from " not in source
    assert "alter " not in source
    assert "drop " not in source


def test_staging_security_audit_checks_reminder_rpc_execution_boundary():
    source = AUDIT.read_text(encoding="utf-8").lower()
    assert "public.enqueue_due_task_reminders(timestamptz,timestamptz,date,integer)" in source
    assert "p.prosecdef" in source
    assert "has_function_privilege('service_role'" in source
    assert "has_function_privilege('authenticated'" in source
    assert "reminder rpc is security definer" in source
