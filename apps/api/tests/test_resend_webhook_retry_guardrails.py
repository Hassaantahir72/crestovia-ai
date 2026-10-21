from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEBHOOK = ROOT / "apps" / "web" / "app" / "api" / "webhooks" / "resend" / "route.ts"
ORIGINAL_MIGRATION = ROOT / "database" / "migrations" / "0030_resend_delivery_webhooks_v0_2_47.sql"
RETRY_MIGRATION = ROOT / "database" / "migrations" / "0033_retry_unmatched_resend_events_v0_2_56.sql"


def test_unmatched_webhook_event_can_be_reprocessed_on_provider_retry():
    sql = RETRY_MIGRATION.read_text(encoding="utf-8").lower()
    assert "create or replace function public.apply_resend_delivery_event" in sql
    assert "on conflict (provider_event_id) do nothing" in sql
    assert "select id, outcome into v_event_row_id, v_existing_outcome" in sql
    assert "for update" in sql
    assert "if v_existing_outcome = 'processed' then" in sql
    assert "return 'reprocessed'" in sql
    assert "return 'unmatched'" in sql


def test_webhook_event_reconciliation_keeps_existing_privileged_boundary():
    original = ORIGINAL_MIGRATION.read_text(encoding="utf-8").lower()
    retry = RETRY_MIGRATION.read_text(encoding="utf-8").lower()
    route = WEBHOOK.read_text(encoding="utf-8")
    assert "security invoker" in retry
    assert "set search_path = ''" in retry
    assert "revoke all on function public.apply_resend_delivery_event(text,text,text,text) from public, anon, authenticated" in original
    assert 'admin.rpc("apply_resend_delivery_event"' in route
    assert 'if (!verifyResendSignature(rawBody, request.headers))' in route
    assert "max_clock_skew_seconds = 300" in route.lower()
    assert "max_body_bytes = 256_000" in route.lower()
