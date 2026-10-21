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
    assert tools.count('.eq("organization_id", organizationId)') == 4
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


def test_assistant_response_can_only_be_submitted_as_an_explicit_approval_request():
    actions = read_web("app/dashboard/assistant/actions.ts")
    page = read_web("app/dashboard/assistant/page.tsx")

    assert "export async function proposeAssistantActionForApproval(data:FormData)" in actions
    assert 'eq("id",messageId).eq("user_id",user.id).eq("role","assistant")' in actions
    assert 'eq("id",message.conversation_id).eq("user_id",user.id)' in actions
    assert '["create_task","external_write","send_email","send_message","calendar_change","data_export","other"].includes(actionType)' in actions
    assert 'from("action_approval_requests").insert(' in actions
    assert 'action:"approval.request.created_from_assistant"' in actions
    assert 'redirect("/dashboard/assistant?conversation="+message.conversation_id+"&approval_created=1")' in actions
    assert 'Turn this response into an approval request' in page
    assert 'It does not execute the proposed action.' in page
    assert 'No action has been executed.' in page


def test_approved_task_execution_is_atomic_owner_scoped_and_invoker_only():
    migration = (ROOT / "database" / "migrations" / "0023_approval_execution_org_scope_v0_2_41.sql").read_text(encoding="utf-8")
    actions = read_web("app/dashboard/actions.ts")
    approvals = read_web("app/dashboard/approvals/page.tsx")

    assert "security invoker" in migration.lower()
    assert "for update" in migration.lower()
    assert "auth.uid()" in migration
    assert "m.role = 'owner'" in migration
    assert "v_request.status <> 'approved'" in migration
    assert "v_request.expires_at <= now()" in migration
    assert "v_request.execution_status <> 'pending'" in migration
    assert "insert into public.tasks" in migration.lower()
    assert "execution_status = 'succeeded'" in migration
    assert "grant execute on function public.execute_approved_task_request(uuid, uuid) to authenticated" in migration.lower()
    assert "r.organization_id = p_organization_id" in migration
    executor = actions[actions.index("export async function executeApprovedTaskRequest"):]
    assert 'supabase.rpc("execute_approved_task_request",{p_request_id:id,p_organization_id:membership.organization_id})' in executor
    assert '.from("tasks").insert(' not in executor
    assert "Unsupported external actions remain disabled" in approvals
    assert "owner-approved email delivery" in approvals


def test_task_reminder_cron_requires_private_secret_and_is_bounded():
    route = read_web("app/api/cron/task-reminders/route.ts")

    assert 'process.env.CRON_SECRET' in route
    assert 'request.headers.get("authorization")' in route
    assert 'status:401' in route
    assert 'createAdminClient()' in route
    assert route.count('.limit(250)') == 2
    assert 'ignoreDuplicates:true' in route
    assert 'cache-control' in route.lower()


def test_notification_inbox_actions_are_recipient_and_org_scoped():
    actions = read_web("app/dashboard/notifications/actions.ts")
    page = read_web("app/dashboard/notifications/page.tsx")

    assert '.eq("recipient_id",user.id)' in actions
    assert '.eq("organization_id",membership.organization_id)' in actions
    assert 'export async function markNotificationRead' in actions
    assert 'export async function markAllNotificationsRead' in actions
    assert '.eq("recipient_id",user.id)' in page
    assert '.order("created_at",{ascending:false})' in page


def test_approval_review_notifies_requester_without_executing_external_actions():
    actions = read_web("app/dashboard/actions.ts")
    start = actions.index("export async function reviewApprovalRequest")
    end = actions.index("export async function executeApprovedTaskRequest", start)
    review = actions[start:end]

    assert '.select("id,requested_by,summary")' in review
    assert 'type:"approval_reviewed"' in review
    assert 'recipient_id:request.requested_by' in review
    assert 'action:"notification.approval_decision.failed"' in review
    assert 'revalidatePath("/dashboard/notifications")' in review
    assert "fetch(" not in review
