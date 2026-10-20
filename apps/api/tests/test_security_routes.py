from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def read_web(path: str) -> str:
    return (WEB / path).read_text(encoding="utf-8")


def test_email_mfa_request_requires_same_origin_authenticated_owner_and_session():
    route = read_web("app/api/security/email-mfa/request/route.ts")

    assert 'request.headers.get("origin")' in route
    assert 'status:403' in route
    assert 'supabase.auth.getUser()' in route
    assert 'm.role==="owner"' in route
    assert 'supabase.auth.getClaims()' in route
    assert 'claims?.session_id' in route
    assert 'admin.rpc("issue_email_mfa_challenge"' in route
    assert 'cache:"no-store"' in route


def test_email_mfa_verify_binds_challenge_to_current_user_session_and_expiry():
    route = read_web("app/api/security/email-mfa/verify/route.ts")

    assert 'request.headers.get("origin")' in route
    assert 'supabase.auth.getUser()' in route
    assert 'm.role==="owner"' in route
    assert 'supabase.auth.getClaims()' in route
    assert '.eq("user_id",user.id)' in route
    assert '.eq("session_id",sessionId)' in route
    assert '.is("used_at",null)' in route
    assert '.gt("expires_at",now)' in route
    assert 'admin.rpc("record_email_mfa_failed_attempt"' in route


def test_email_mfa_cookie_is_set_only_after_single_use_challenge_consumed():
    route = read_web("app/api/security/email-mfa/verify/route.ts")

    consume = route.index('const {data:consumed,error:consumeError}')
    token = route.index('token=createEmailMfaToken(user.id,sessionId)')
    cookie = route.index('store.set(EMAIL_MFA_COOKIE,token,emailMfaCookieOptions())')
    assert consume < token < cookie
    assert '.eq("id",challenge.id).is("used_at",null)' in route
    assert 'if(consumeError||!consumed)' in route
    assert 'timingSafeEqual(expected,actual)' in route


def test_audit_writer_is_server_only_and_uses_typed_bounded_metadata_shape():
    audit = read_web("lib/security/audit.ts")

    assert audit.startswith('"use server";')
    assert 'await import("@/lib/supabase/admin")' in audit
    assert 'organization_id: event.organizationId' in audit
    assert 'actor_id: event.actorId' in audit
    assert 'metadata: event.metadata ?? {}' in audit
    assert 'metadata?: Record<string, string | number | boolean | null>' in audit
    assert 'comment bodies, or long free-text content' in audit
