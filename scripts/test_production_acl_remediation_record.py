from pathlib import Path


def test_production_acl_record_is_review_only_and_requires_owner_approval():
    doc = Path(__file__).resolve().parents[1] / "docs/database/PRODUCTION_ACL_REMEDIATION_CHANGE_RECORD.md"
    text = doc.read_text(encoding="utf-8")
    assert "Prepared for review only — not approved or applied" in text
    assert "Owner explicitly approves a production ACL change window" in text
    assert "does not authorize production SQL execution" in text


def test_production_acl_record_covers_scope_and_rollback_safety():
    doc = Path(__file__).resolve().parents[1] / "docs/database/PRODUCTION_ACL_REMEDIATION_CHANGE_RECORD.md"
    text = doc.read_text(encoding="utf-8")
    for expected in (
        "11 tables have effective privileges for role `anon`",
        "15 tables grant `authenticated` elevated table privileges",
        "supabase_admin",
        "exact captured ACL/default-ACL state",
        "cross-organization and role-boundary acceptance",
        "leaked-password protection disabled",
    ):
        assert expected in text
