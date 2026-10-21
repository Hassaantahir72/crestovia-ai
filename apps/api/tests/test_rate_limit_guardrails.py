from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
MIGRATION = ROOT / "database" / "migrations" / "0032_user_rate_limits_v0_2_52.sql"
WEB = ROOT / "apps" / "web"


def test_rate_limit_ledger_is_private_and_function_is_atomic_invoker_only():
    sql = re.sub(r"\s+", " ", MIGRATION.read_text(encoding="utf-8").lower())
    assert "create table public.user_rate_limit_buckets" in sql
    assert "primary key (user_id, bucket)" in sql
    assert "enable row level security" in sql
    assert 'create policy "deny browser access to user rate limit buckets"' in sql
    assert "using (false) with check (false)" in sql
    assert "revoke all privileges on table public.user_rate_limit_buckets from public, anon, authenticated" in sql
    assert "grant select, insert, update, delete on table public.user_rate_limit_buckets to service_role" in sql
    assert "create or replace function public.consume_user_rate_limit" in sql
    assert "security invoker" in sql
    assert "set search_path = ''" in sql
    assert "on conflict (user_id, bucket) do update" in sql
    assert "return v_count <= p_limit" in sql
    assert "revoke all on function public.consume_user_rate_limit(uuid, text, integer, integer) from public, anon, authenticated" in sql
    assert "grant execute on function public.consume_user_rate_limit(uuid, text, integer, integer) to service_role" in sql
    assert "security definer" not in sql


def test_rate_limit_helper_is_server_only_and_fails_closed():
    helper = (WEB / "lib" / "security" / "rate-limit.ts").read_text(encoding="utf-8")
    assert helper.startswith('import "server-only";')
    assert 'createAdminClient()' in helper
    assert 'admin.rpc("consume_user_rate_limit"' in helper
    assert 'throw new Error("RATE_LIMIT_UNAVAILABLE")' in helper
    assert 'typeof data!=="boolean"' in helper


def test_assistant_message_and_provider_test_are_rate_limited_before_external_calls():
    actions = (WEB / "app" / "dashboard" / "assistant" / "actions.ts").read_text(encoding="utf-8")
    page = (WEB / "app" / "dashboard" / "assistant" / "page.tsx").read_text(encoding="utf-8")
    message_start = actions.index("export async function sendAssistantMessage")
    message_end = actions.index("export async function deleteConversation", message_start)
    message_action = actions[message_start:message_end]
    provider_start = actions.index("export async function testAssistantProvider")
    provider_end = actions.index("export async function createConversation", provider_start)
    provider_action = actions[provider_start:provider_end]

    assert 'consumeUserRateLimit(user.id,"assistant_message_minute",12,60)' in message_action
    assert 'consumeUserRateLimit(user.id,"assistant_message_hour",100,3600)' in message_action
    assert message_action.index("consumeUserRateLimit(") < message_action.index("generateAssistantReply(")
    assert 'consumeUserRateLimit(user.id,"assistant_provider_test_minute",3,60)' in provider_action
    assert 'consumeUserRateLimit(user.id,"assistant_provider_test_hour",10,3600)' in provider_action
    assert provider_action.index("consumeUserRateLimit(") < provider_action.index('fetch("https://api.groq.com/openai/v1/chat/completions"')
    assert "assistant_rate_limited:" in page
    assert "rate_limit_unavailable:" in page
    assert "provider_test_app_rate_limited:" in page
    assert "provider_test_rate_limit_unavailable:" in page
