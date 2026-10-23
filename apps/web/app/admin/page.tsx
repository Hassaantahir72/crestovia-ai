import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";

/**
 * Platform administration is separate from normal workspace dashboards.
 * Access is denied unless the signed-in account is explicitly allowlisted
 * by PLATFORM_ADMIN_EMAILS and has an active owner membership.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function strongSecret(name: string, minimumLength = 32): boolean {
  const value = process.env[name]?.trim();
  return Boolean(value && value.length >= minimumLength);
}

export default async function PlatformAdminPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email) redirect("/login");

  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  // Fail closed: no default admin account and no public registration path.
  if (!allowlist.includes(user.email.toLowerCase())) redirect("/dashboard");

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("organization_id, role, status, organizations(name, slug)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipError || !memberships?.some((membership) => membership.role === "owner")) {
    redirect("/dashboard");
  }

  await enforceOwnerMfa(supabase, "owner");

  const checks = [
    { label: "Admin email allowlist", ok: allowlist.length > 0, guidance: "PLATFORM_ADMIN_EMAILS" },
    { label: "Supabase public connection", ok: configured("NEXT_PUBLIC_SUPABASE_URL") && Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()), guidance: "Supabase URL and publishable/anon key" },
    { label: "Supabase server role key", ok: configured("SUPABASE_SERVICE_ROLE_KEY"), guidance: "SUPABASE_SERVICE_ROLE_KEY" },
    { label: "Groq AI provider key", ok: configured("GROQ_API_KEY"), guidance: "GROQ_API_KEY" },
    { label: "Email MFA configuration", ok: ["SUPABASE_SERVICE_ROLE_KEY", "APP_MFA_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL"].every(configured), guidance: "Service role, MFA secret, Resend key and sender" },
    { label: "Resend webhook verification", ok: configured("RESEND_WEBHOOK_SECRET"), guidance: "RESEND_WEBHOOK_SECRET" },
    { label: "Cron authentication secret", ok: strongSecret("CRON_SECRET"), guidance: "CRON_SECRET (at least 32 characters)" },
  ];

  return (
    <main className="container">
      <nav className="workspace-nav">
        <Link href="/dashboard">← Team workspace</Link>
        <Link href="/dashboard/security">Security settings</Link>
      </nav>
      <header className="page-header">
        <div>
          <p className="brand">CRESTOVIA AI / PRIVATE ADMIN</p>
          <h1>Platform administration</h1>
          <p className="muted">Restricted owner control center. Access requires an explicit server-side email allowlist and owner MFA.</p>
        </div>
      </header>
      <section className="grid">
        <article className="panel">
          <h2>Company workspaces</h2>
          <p className="muted">Your active owner memberships. Workspace membership remains the boundary for team data; this panel does not bypass organization access policies.</p>
          <ul className="admin-workspace-list">
            {memberships.filter((membership) => membership.role === "owner").map((membership) => {
              const organization = Array.isArray(membership.organizations)
                ? membership.organizations[0]
                : membership.organizations;
              return (
                <li key={membership.organization_id}>
                  <strong>{organization?.name ?? "Company workspace"}</strong>
                  <span className="muted">{organization?.slug ? `/${organization.slug}` : "Workspace identifier unavailable"}</span>
                </li>
              );
            })}
          </ul>
          <div className="action-links"><Link className="button" href="/dashboard">Open owner workspace</Link><Link className="button button-secondary" href="/dashboard/team">Team access</Link></div>
        </article>
        <article className="panel">
          <h2>Security and audit</h2>
          <p className="muted">Review account security and workspace audit history. Sensitive controls must remain protected by server-side authorization and database policies.</p>
          <div className="action-links"><Link className="button button-secondary" href="/dashboard/security">Security settings</Link><Link className="button button-secondary" href="/dashboard/audit">Audit history</Link><Link className="button button-secondary" href="/dashboard/readiness">Release readiness</Link></div>
        </article>
        <article className="panel">
          <h2>Configuration checks</h2>
          <p className="muted">Presence-only checks for server configuration. Secret values are never displayed. A configured key does not prove that a provider connection works.</p>
          <ul className="admin-workspace-list">
            {checks.map((check) => (
              <li key={check.label}>
                <strong>{check.label}</strong>
                <span className={check.ok ? "notice notice-success" : "notice notice-error"}>{check.ok ? "Configured" : "Missing or too short"}</span>
                <span className="muted">{check.guidance}</span>
              </li>
            ))}
          </ul>
          <p className="muted">Fix missing settings in the hosting provider&apos;s private environment configuration, then redeploy if required. Never paste credentials into this panel or source control.</p>
        </article>
        <article className="panel">
          <h2>Company AI</h2>
          <p className="muted">The assistant can read bounded, active-organization summaries and the signed-in member&apos;s assigned tasks. It cannot directly modify company data or execute external actions.</p>
          <p className="muted">AI-generated actions must be submitted to the owner approval queue. Personal conversations and saved memories remain scoped to the individual account.</p>
          <div className="action-links"><Link className="button" href="/dashboard/assistant">Open Company AI</Link><Link className="button button-secondary" href="/dashboard/approvals">Review approvals</Link></div>
        </article>
      </section>
    </main>
  );
}
