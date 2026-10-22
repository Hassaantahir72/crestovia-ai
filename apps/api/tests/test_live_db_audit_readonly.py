from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
AUDIT_SQL = ROOT / "database" / "operations" / "live-db-security-audit.sql"


def test_live_database_audit_sql_is_read_only():
    source = AUDIT_SQL.read_text(encoding="utf-8")
    without_comments = re.sub(r"--[^\n]*", "", source)
    statements = [statement.strip() for statement in without_comments.split(";") if statement.strip()]
    assert len(statements) == 6
    assert all(re.match(r"^select\b", statement, re.IGNORECASE) for statement in statements)
    assert all(not re.match(r"^(insert|update|delete|alter|drop|create|grant|revoke|truncate)\b", statement, re.IGNORECASE) for statement in statements)


def test_live_database_audit_covers_rls_grants_definer_functions_and_migrations():
    source = AUDIT_SQL.read_text(encoding="utf-8").lower()
    assert "relrowsecurity" in source
    assert "role_table_grants" in source
    assert "pg_default_acl" in source
    assert "has_table_privilege" in source
    assert "prosecdef" in source
    assert "has_function_privilege('anon', p.oid, 'execute')" in source
    assert "has_function_privilege('authenticated', p.oid, 'execute')" in source
    assert "public_can_execute" in source
    assert "supabase_migrations.schema_migrations" in source
