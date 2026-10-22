from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MIGRATION = ROOT / "database" / "migrations" / "0034_revoke_anon_public_privileges.sql"


def normalized_sql() -> str:
    return re.sub(r"\s+", " ", MIGRATION.read_text(encoding="utf-8").lower()).strip()


def test_migration_0034_revokes_global_defaults_for_postgres_created_objects():
    sql = normalized_sql()

    # Global default ACLs are additive to schema-specific defaults.
    owner_role = "postgres"
    assert f"alter default privileges for role {owner_role} revoke all on tables from anon" in sql
    assert f"alter default privileges for role {owner_role} revoke all on sequences from anon" in sql
    assert f"alter default privileges for role {owner_role} revoke execute on functions from anon" in sql
    assert f"alter default privileges for role {owner_role} revoke execute on functions from authenticated" in sql
    assert f"alter default privileges for role {owner_role} revoke execute on functions from public" in sql
    assert f"alter default privileges for role {owner_role} revoke truncate, references, trigger, maintain on tables from authenticated" in sql


def test_migration_0034_documents_hosted_role_limit_and_keeps_row_access():
    sql = normalized_sql()

    assert "affect future objects created by postgres" in sql
    assert "in every schema postgres owns" in sql
    assert "not a member of supabase_admin" in sql
    assert "separate privileged platform operation" in sql
    assert "alter default privileges for role supabase_admin revoke" not in sql
    assert "revoke execute on all functions in schema public from authenticated" not in sql
    assert "revoke truncate, references, trigger, maintain on all tables in schema public from authenticated" in sql
    assert "revoke all on tables from anon" in sql
    assert "revoke all on sequences from anon" in sql
