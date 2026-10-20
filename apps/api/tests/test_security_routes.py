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


def test_private_memory_update_is_validated_and_scoped_to_signed_in_user():
    actions = read_web("app/dashboard/assistant/actions.ts")

    assert 'export async function updateMemory(data:FormData)' in actions
    assert 'allowedCategories=["general","work","preference","project","process"]' in actions
    assert '.from("assistant_memories").select("id").eq("id",id).eq("user_id",user.id)' in actions
    assert '.from("assistant_memories").update({title,category,content,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id)' in actions
    assert 'field(data,"title",160)' in actions
    assert 'field(data,"content",12000)' in actions


def test_assistant_provider_readiness_never_exposes_secret_value():
    page = read_web("app/dashboard/assistant/page.tsx")

    assert 'Boolean(process.env.GROQ_API_KEY)' in page
    assert 'AI provider key detected; connectivity and validity have not been tested yet.' in page
    assert 'Never use a NEXT_PUBLIC_ variable or commit the key.' in page
    assert 'process.env.GROQ_API_KEY}' not in page


def test_ai_provider_connection_test_is_owner_only_bounded_and_secret_safe():
    actions = read_web("app/dashboard/assistant/actions.ts")
    page = read_web("app/dashboard/assistant/page.tsx")

    assert "export async function testAssistantProvider()" in actions
    assert 'if(membership.role!=="owner")redirect("/dashboard/assistant?provider_test=owner_only")' in actions
    assert 'const apiKey=process.env.GROQ_API_KEY' in actions
    assert 'signal:AbortSignal.timeout(10000)' in actions
    assert 'max_tokens:8' in actions
    assert 'cache:"no-store"' in actions
    assert 'Authorization:"Bearer "+apiKey' in actions
    assert "the API key was not exposed." in page
    assert "GROQ_API_KEY" not in actions[actions.index("export async function testAssistantProvider()"):actions.index("export async function createConversation()")].replace('const apiKey=process.env.GROQ_API_KEY','')



def test_assistant_workspace_tools_are_read_only_scoped_and_bounded():
    tools = read_web("lib/ai/workspace-tools.ts")

    assert 'type ReadOnlyTool' in tools
    assert 'mode: "read_only"' in tools
    assert 'READ_ONLY_TOOL_REGISTRY.filter(tool => tool.mode === "read_only" && tool.matches(latestMessage))' in tools
    assert tools.count('.eq("organization_id", organizationId)') == 3
    assert '.eq("assigned_to", userId)' in tools
    assert 'supabase.from("tasks").select(' in tools
    assert 'supabase.from("projects").select(' in tools
    assert 'supabase.from("action_approval_requests").select(' in tools
    assert ".insert(" not in tools
    assert ".update(" not in tools
    assert ".delete(" not in tools
    assert ".upsert(" not in tools
    assert ".limit(100)" in tools
    assert ".limit(40)" in tools
    assert ".limit(20)" in tools
    assert "function safeText" in tools
    assert "u0000" in tools
