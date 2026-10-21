from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def read_web(path: str) -> str:
    return (WEB / path).read_text(encoding="utf-8")


def test_direct_approval_requests_are_throttled_before_insert():
    actions = read_web("app/dashboard/actions.ts")
    page = read_web("app/dashboard/approvals/page.tsx")
    start = actions.index("export async function createApprovalRequest")
    end = actions.index("export async function reviewApprovalRequest", start)
    action = actions[start:end]
    insert = action.index('.from("action_approval_requests").insert(')

    assert 'consumeUserRateLimit(user.id,"approval_request_minute",3,60)' in action
    assert 'consumeUserRateLimit(user.id,"approval_request_hour",10,3600)' in action
    assert 'consumeUserRateLimit(user.id,"approval_request_day",30,86400)' in action
    assert action.index("consumeUserRateLimit(") < insert
    assert 'if(!approvalAllowed)redirect("/dashboard/approvals?error=approval_rate_limited")' in action
    assert 'approval_rate_limited: "You have created too many approval requests.' in page
    assert 'approval_rate_limit_unavailable: "Request protection is unavailable' in page


def test_assistant_proposals_share_the_same_approval_request_buckets():
    actions = read_web("app/dashboard/assistant/actions.ts")
    page = read_web("app/dashboard/assistant/page.tsx")
    start = actions.index("export async function proposeAssistantActionForApproval")
    action = actions[start:]
    insert = action.index('.from("action_approval_requests").insert(')

    assert 'consumeUserRateLimit(user.id,"approval_request_minute",3,60)' in action
    assert 'consumeUserRateLimit(user.id,"approval_request_hour",10,3600)' in action
    assert 'consumeUserRateLimit(user.id,"approval_request_day",30,86400)' in action
    assert action.index("consumeUserRateLimit(") < insert
    assert 'approval_rate_limited:"You have created too many approval requests.' in page
    assert 'approval_rate_limit_unavailable:"Request protection is unavailable' in page


def test_approval_rate_limit_uses_private_server_only_helper_without_new_schema():
    helper = read_web("lib/security/rate-limit.ts")
    actions = read_web("app/dashboard/actions.ts")
    assistant_actions = read_web("app/dashboard/assistant/actions.ts")
    assert helper.startswith('import "server-only";')
    assert 'admin.rpc("consume_user_rate_limit"' in helper
    assert actions.count('import { consumeUserRateLimit } from "@/lib/security/rate-limit";') == 1
    assert 'import {consumeUserRateLimit} from "@/lib/security/rate-limit";' in assistant_actions
