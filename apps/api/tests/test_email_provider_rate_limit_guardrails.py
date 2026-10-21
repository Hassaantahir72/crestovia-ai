from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def read_web(path: str) -> str:
    return (WEB / path).read_text(encoding="utf-8")


def test_resend_connection_test_is_rate_limited_before_provider_request():
    actions = read_web("app/dashboard/approvals/email-actions.ts")
    page = read_web("app/dashboard/approvals/page.tsx")
    start = actions.index("export async function testEmailProviderConnection")
    action = actions[start:]
    provider_call = action.index('fetch("https://api.resend.com/domains"')

    assert 'consumeUserRateLimit(user.id, "email_provider_test_minute", 3, 60)' in action
    assert 'consumeUserRateLimit(user.id, "email_provider_test_hour", 10, 3600)' in action
    assert action.index("consumeUserRateLimit(") < provider_call
    assert 'redirect("/dashboard/approvals?error=email_connection_rate_limited")' in action
    assert 'redirect("/dashboard/approvals?error=email_connection_rate_limit_unavailable")' in action
    assert 'email_connection_rate_limited: "Too many Resend connection tests.' in page
    assert 'email_connection_rate_limit_unavailable: "Request protection is unavailable' in page


def test_email_provider_rate_limit_reuses_private_server_only_helper():
    helper = read_web("lib/security/rate-limit.ts")
    actions = read_web("app/dashboard/approvals/email-actions.ts")
    assert helper.startswith('import "server-only";')
    assert 'admin.rpc("consume_user_rate_limit"' in helper
    assert 'import { consumeUserRateLimit } from "@/lib/security/rate-limit";' in actions
