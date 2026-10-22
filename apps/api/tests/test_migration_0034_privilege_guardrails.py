"""Static regression checks for the high-impact public-schema ACL migration.

These tests protect migration intent in CI; they do not replace a database-level
privilege audit or non-production migration/restore acceptance.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MIGRATION = ROOT / "database" / "migrations" / "0034_revoke_anon_public_privileges.sql"


def normalized_migration() -> str:
    return " ".join(MIGRATION.read_text(encoding="utf-8").lower().split())


def test_migration_removes_existing_anon_data_api_privileges():
    sql = normalized_migration()
    assert "revoke all privileges on all tables in schema public from anon" in sql
    assert "revoke all privileges on all sequences in schema public from anon" in sql
    assert "revoke execute on all functions in schema public from anon" in sql


def test_migration_removes_authenticated_table_admin_privileges():
    sql = normalized_migration()
    assert (
        "revoke truncate, references, trigger, maintain "
        "on all tables in schema public from authenticated"
    ) in sql


def test_global_default_acl_scope_is_explicit_and_covers_both_object_owners():
    sql = normalized_migration()
    assert "global default acls are additive" in sql
    assert "affect future objects" in sql
    assert "in every schema they own" in sql
    for role in ("postgres", "supabase_admin"):
        assert f"alter default privileges for role {role}" in sql
        assert f"alter default privileges for role {role} in schema public" in sql


def test_future_function_execution_is_opt_in_for_public_and_client_roles():
    sql = normalized_migration()
    for role in ("postgres", "supabase_admin"):
        assert f"revoke execute on functions from public" in sql
        assert f"revoke execute on functions from anon" in sql
        assert f"revoke execute on functions from authenticated" in sql
        assert f"revoke execute on functions from public" in sql
        assert f"alter default privileges for role {role} in schema public" in sql


def test_future_authenticated_tables_do_not_receive_admin_privileges():
    sql = normalized_migration()
    expected = "revoke truncate, references, trigger, maintain on tables from authenticated"
    assert sql.count(expected) >= 4


def test_privilege_migration_does_not_claim_to_change_rls_or_replace_live_acceptance():
    sql = normalized_migration()
    assert "preserves authenticated select/insert/update/delete grants and rls policies" in sql
    assert "apply only after reviewing the live-database audit" in sql
