from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WEB = ROOT / "apps" / "web"


def test_launch_readiness_page_is_owner_only_and_requires_owner_mfa():
    page = (WEB / "app" / "dashboard" / "readiness" / "page.tsx").read_text(encoding="utf-8")
    dashboard = (WEB / "app" / "dashboard" / "page.tsx").read_text(encoding="utf-8")

    assert 'supabase.auth.getUser()' in page
    assert 'getActiveOrganizationMembership(supabase,user)' in page
    assert 'if(!membership)redirect("/onboarding")' in page
    assert 'if(membership.role!=="owner")redirect("/dashboard")' in page
    assert 'await enforceOwnerMfa(supabase,membership.role)' in page
    assert 'href="/dashboard/readiness"' in dashboard


def test_launch_readiness_checks_presence_without_rendering_secret_values():
    page = (WEB / "app" / "dashboard" / "readiness" / "page.tsx").read_text(encoding="utf-8")

    for name in (
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "APP_MFA_SECRET",
        "GROQ_API_KEY",
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "RESEND_WEBHOOK_SECRET",
        "CRON_SECRET",
    ):
        assert name in page

    assert "process.env.GROQ_API_KEY}" not in page
    assert "process.env.RESEND_API_KEY}" not in page
    assert "process.env.SUPABASE_SERVICE_ROLE_KEY}" not in page
    assert "It does not prove that credentials are valid" in page


def test_active_organization_cookie_is_reauthorized_against_active_membership():
    helper = (WEB / "lib" / "organizations" / "active-membership.ts").read_text(encoding="utf-8")
    action = (WEB / "app" / "dashboard" / "organization-actions.ts").read_text(encoding="utf-8")

    # A cookie selects a preference only; it must not grant access to an organization.
    assert '.eq("user_id", user.id)' in helper
    assert '.eq("status", "active")' in helper
    assert 'memberships.find((item) => item.organization_id === preferredId) ?? memberships[0]' in helper
    assert '.eq("organization_id", organizationId)' in action
    assert '.eq("user_id", user.id)' in action
    assert '.eq("status", "active")' in action
    assert 'httpOnly: true' in action


def test_core_workspace_reads_are_scoped_to_the_selected_organization():
    # Keep the most sensitive cross-company workspace reads tied to the membership
    # selected by the server-side, re-authorized active-organization helper.
    cases = {
        "projects": ("app/dashboard/projects/page.tsx", '.eq("organization_id",m.organization_id)'),
        "tasks": ("app/dashboard/tasks/page.tsx", '.eq("organization_id",m.organization_id)'),
        "approvals": ("app/dashboard/approvals/page.tsx", '.eq("organization_id", m.organization_id)'),
        "audit": ("app/dashboard/audit/page.tsx", '.eq("organization_id", membership.organization_id)'),
        "notifications": ("app/dashboard/notifications/page.tsx", '.eq("organization_id",membership.organization_id)'),
        "team": ("app/dashboard/team/page.tsx", '.eq("organization_id",m.organization_id)'),
    }
    for name, (relative_path, required_scope) in cases.items():
        page = (WEB / relative_path).read_text(encoding="utf-8")
        assert "getActiveOrganizationMembership" in page, f"{name} must resolve an authorized active organization"
        assert required_scope in page, f"{name} query must filter by the selected organization"


def test_mutating_workspace_actions_validate_organization_scope():
    actions = (WEB / "app" / "dashboard" / "actions.ts").read_text(encoding="utf-8")

    # Mutations use the organization from the authenticated membership, not form data.
    assert 'organization_id:membership.organization_id' in actions
    assert '.eq("organization_id",membership.organization_id)' in actions
    assert '.eq("organization_id", membership.organization_id)' in actions
    assert 'if(membership.role!=="owner")' in actions
