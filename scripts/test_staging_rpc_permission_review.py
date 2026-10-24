from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "docs" / "database" / "STAGING_RPC_PERMISSION_REVIEW_2026-10-23.md"


def test_rpc_review_records_verified_permission_boundary_and_limits():
    source = REVIEW.read_text(encoding="utf-8")
    assert "Read-only inspection completed; runtime acceptance remains incomplete" in source
    assert "enqueue_due_task_reminders" in source
    assert "execute_approved_task_request" in source
    assert "SECURITY INVOKER" in source
    assert "not** proof that the complete live request path behaves correctly" in source
    assert "No production SQL was run" in source


def test_rpc_review_requires_cross_tenant_and_replay_acceptance():
    source = REVIEW.read_text(encoding="utf-8")
    for expected in (
        "A member/non-owner cannot execute",
        "owner from a different organization cannot execute",
        "already-succeeded requests are rejected",
        "Replaying a successful request does not create a duplicate task",
        "never crosses organization boundaries",
        "This document authorizes no production migration",
    ):
        assert expected in source
