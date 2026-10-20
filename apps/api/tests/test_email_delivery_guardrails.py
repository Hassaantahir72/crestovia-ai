from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PROVIDER = ROOT / "apps" / "web" / "lib" / "email" / "provider.ts"
ACTION = ROOT / "apps" / "web" / "app" / "dashboard" / "approvals" / "email-actions.ts"
MIGRATION = ROOT / "database" / "migrations" / "0028_transactional_email_delivery_v0_2_46.sql"


def test_email_provider_is_server_only_and_uses_resend_idempotency():
    source = PROVIDER.read_text()
    assert 'import "server-only"' in source
    assert '"Idempotency-Key": idempotencyKey' in source
    assert 'cache: "no-store"' in source
    assert "AbortSignal.timeout(10000)" in source
    assert "RESEND_API_KEY" in source and "RESEND_FROM_EMAIL" in source


def test_email_execution_is_approved_owner_scoped_and_bounded():
    source = ACTION.read_text()
    assert 'request.action_type !== "send_email"' in source
    assert 'request.status !== "approved"' in source
    assert 'eq("organization_id", membership.organization_id)' in source
    assert 'await enforceOwnerMfa(supabase, membership.role)' in source
    assert '.in("execution_status", ["pending", "failed"])' in source
    assert "attempts > 3" in source
    assert "validateApprovedEmailPayload(request.details)" in source


def test_email_delivery_ledger_has_rls_and_no_browser_write_grants():
    source = MIGRATION.read_text().lower()
    assert "enable row level security" in source
    assert "revoke all on table public.email_delivery_attempts from anon, authenticated" in source
    assert "grant select on table public.email_delivery_attempts to authenticated" in source
    assert "unique" in source and "idempotency_key" in source
    assert "role = 'owner'" in source
