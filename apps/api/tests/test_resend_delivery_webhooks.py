from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ROUTE = ROOT / "apps" / "web" / "app" / "api" / "webhooks" / "resend" / "route.ts"
MIGRATION = ROOT / "database" / "migrations" / "0030_resend_delivery_webhooks_v0_2_47.sql"


def test_resend_webhook_verifies_raw_body_signature_and_timestamp():
    source = ROUTE.read_text()
    assert 'async function readBoundedBody(request: Request)' in source
    assert 'request.body.getReader()' in source
    assert 'totalBytes > MAX_BODY_BYTES' in source
    assert 'createHmac("sha256"' in source
    assert "timingSafeEqual" in source
    assert "MAX_CLOCK_SKEW_SECONDS = 300" in source
    assert 'status: 401' in source
    assert "RESEND_WEBHOOK_SECRET" in source


def test_webhook_is_bounded_and_only_accepts_known_delivery_events():
    source = ROUTE.read_text()
    assert "MAX_BODY_BYTES = 256_000" in source
    assert '"email.delivered"' in source
    assert '"email.bounced"' in source
    assert '"email.complained"' in source
    assert 'status: 413' in source


def test_delivery_event_processing_is_idempotent_and_service_role_only():
    source = MIGRATION.read_text().lower()
    assert "provider_event_id text not null unique" in source
    assert "on conflict (provider_event_id) do nothing" in source
    assert "security invoker" in source
    assert "revoke all on function public.apply_resend_delivery_event(text,text,text,text) from public, anon, authenticated" in source
    assert "grant execute on function public.apply_resend_delivery_event(text,text,text,text) to service_role" in source
    assert "enable row level security" in source


def test_delivery_event_table_has_explicit_deny_policy_for_browser_roles():
    migration = (ROOT / "database" / "migrations" / "0031_private_delivery_event_rls_v0_2_48.sql").read_text().lower()
    assert 'create policy "deny browser access to email delivery events"' in migration
    assert "for all" in migration
    assert "to anon, authenticated" in migration
    assert "using (false)" in migration
    assert "with check (false)" in migration
