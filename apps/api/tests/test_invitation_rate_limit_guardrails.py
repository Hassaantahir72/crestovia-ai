from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def read_web(path: str) -> str:
    return (WEB / path).read_text(encoding="utf-8")


def test_team_invitation_rate_limits_before_auth_email_delivery():
    actions = read_web("app/dashboard/actions.ts")
    page = read_web("app/dashboard/team/page.tsx")
    start = actions.index("export async function inviteTeamMember")
    end = actions.index("export async function revokeTeamInvitation", start)
    invite = actions[start:end]

    owner_check = invite.index('if(membership.role!=="owner")')
    minute_limit = invite.index('consumeUserRateLimit(user.id,"team_invite_minute",5,60)')
    hour_limit = invite.index('consumeUserRateLimit(user.id,"team_invite_hour",20,3600)')
    day_limit = invite.index('consumeUserRateLimit(user.id,"team_invite_day",50,86400)')
    provider_call = invite.index('adminClient.auth.admin.inviteUserByEmail(email)')
    assert owner_check < minute_limit < provider_call
    assert hour_limit < provider_call and day_limit < provider_call
    assert 'if(!inviteAllowed)redirect("/dashboard/team?error=invitation_rate_limited")' in invite
    assert 'redirect("/dashboard/team?error=invitation_rate_limit_unavailable")' in invite
    assert 'invitation_rate_limited:"You have sent too many invitations.' in page
    assert 'invitation_rate_limit_unavailable:"Invitation protection is unavailable' in page


def test_existing_pending_invitation_and_tracked_active_member_are_checked_before_email_send():
    actions = read_web("app/dashboard/actions.ts")
    start = actions.index("export async function inviteTeamMember")
    end = actions.index("export async function revokeTeamInvitation", start)
    invite = actions[start:end]
    provider_call = invite.index('adminClient.auth.admin.inviteUserByEmail(email)')

    assert invite.index('.select("id,invited_user_id,status")') < provider_call
    assert invite.index('if(lookupError)redirect("/dashboard/team?error=invite_lookup_failed")') < provider_call
    assert invite.index('if(trackedInvitation?.status==="pending")') < provider_call
    assert invite.index('if(existing?.status==="active")') < provider_call
    assert 'consumeUserRateLimit' in invite


def test_invitation_rate_limiter_reuses_private_server_only_helper():
    helper = read_web("lib/security/rate-limit.ts")
    actions = read_web("app/dashboard/actions.ts")
    assert helper.startswith('import "server-only";')
    assert 'admin.rpc("consume_user_rate_limit"' in helper
    assert 'import { consumeUserRateLimit } from "@/lib/security/rate-limit";' in actions
