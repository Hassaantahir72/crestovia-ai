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
          <div className="action-links"><Link className="button button-secondary" href="/dashboard/security">Security settings</Link><Link className="button button-secondary" href="/dashboard/audit">Audit history</Link></div>
        </article>
        <article className="panel">
          <h2>Connected services</h2>
          <p className="muted">Provider credentials and platform secrets must be configured privately in the hosting dashboard. This page never displays secret values.</p>
          <p className="notice notice-error">Admin allowlist is a separate server-side setting. Configure PLATFORM_ADMIN_EMAILS privately before expecting this panel to open.</p>
        </article>
      </section>
    </main>
  );
}
