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
