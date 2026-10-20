from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MIGRATIONS = ROOT / "database" / "migrations"
WEB = ROOT / "apps" / "web"


def compact_sql(path: str) -> str:
    return re.sub(r"\\s+", " ", (MIGRATIONS / path).read_text(encoding="utf-8").lower()).strip()


def test_approval_insert_is_self_requested_and_starts_pending():
    sql = compact_sql("0011_approval_request_queue.sql")
    assert 'create policy "active members request approvals"' in sql
    assert "for insert to authenticated with check" in sql
    assert "requested_by = (select auth.uid())" in sql
    assert "status = 'pending'" in sql
    assert "reviewed_by is null" in sql
    assert "reviewed_at is null" in sql
    assert "m.status = 'active'" in sql


def test_only_organization_owner_can_update_approval_records():
    sql = compact_sql("0011_approval_request_queue.sql")
    assert 'create policy "organization owners review approval requests"' in sql
    assert "for update to authenticated using (app_private.is_org_owner(organization_id))" in sql
    assert "with check (app_private.is_org_owner(organization_id))" in sql


def test_review_action_is_owner_only_pending_and_unexpired():
    actions = (WEB / "app" / "dashboard" / "actions.ts").read_text(encoding="utf-8")
    start = actions.index("export async function reviewApprovalRequest")
    review = actions[start:]
    assert 'if(membership.role!=="owner")' in review
    assert '["approved","rejected"].includes(decision)' in review
    assert '.eq("status","pending")' in review
    assert '.gt("expires_at",new Date().toISOString())' in review
    assert 'action:"approval.request.reviewed"' in review


def test_approval_queue_does_not_execute_external_actions():
    page = (WEB / "app" / "dashboard" / "approvals" / "page.tsx").read_text(encoding="utf-8")
    actions = (WEB / "app" / "dashboard" / "actions.ts").read_text(encoding="utf-8")
    assert "Approval records do not execute actions in this version." in page
    assert 'action:"approval.request.created"' in actions
    assert 'action:"approval.request.reviewed"' in actions
    # Guard against accidental expansion of the approval handlers into outbound actions.
    review = actions[actions.index("export async function reviewApprovalRequest"):]
    assert "fetch(" not in review
    assert "sendEmail(" not in review
    assert "sendMessage(" not in review
