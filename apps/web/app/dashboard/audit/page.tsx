import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const actionOptions = [
  "organization.created", "project.created", "task.created", "task.status.updated", "task.comment.added",
  "task.comment.deleted", "department.created", "department.updated", "department.deleted",
  "team.project_member.assigned", "team.project_member.removed", "team.member.access_updated",
  "approval.request.created", "approval.request.reviewed", "membership.invitation.sent",
  "membership.invitation.revoked"
];
function displayAction(action: string) { return action.split(".").map(part => part.replace(/_/g, " ")).join(" · "); }

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard?error=owner_admin_only");
  await enforceOwnerMfa(supabase, membership.role);

  const action = typeof params.action === "string" && actionOptions.includes(params.action) ? params.action : "";
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  let request = supabase.from("audit_logs")
    .select("id,actor_id,action,entity_type,entity_id,metadata,created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false }).limit(100);
  if (action) request = request.eq("action", action);
  if (query) request = request.ilike("action", "%" + query.replace(/[%_,]/g, "") + "%");
  const { data: events, error } = await request;
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/tasks">Tasks</Link><Link href="/dashboard/team">Team access</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / SECURITY</p><h1>Audit history</h1><p className="muted">{organization?.name ?? "Workspace"} · Latest 100 matching events</p></div><span className="role-pill">{membership.role}</span></header>
    <section className="panel">
      <h2>Filter events</h2>
      <form method="get" className="form-grid">
        <div><label htmlFor="action">Action type</label><select id="action" name="action" defaultValue={action}><option value="">All recorded actions</option>{actionOptions.map(option => <option key={option} value={option}>{displayAction(option)}</option>)}</select></div>
        <div><label htmlFor="q">Search action name</label><input id="q" name="q" maxLength={80} defaultValue={query} placeholder="e.g. task, approval, invitation" /></div>
        <div className="action-links"><button type="submit" className="button">Apply filters</button><Link className="button button-secondary" href="/dashboard/audit">Clear</Link></div>
      </form>
    </section>
    <section className="panel" style={{ marginTop: 18 }}>
      <h2>Recorded events</h2>
      <p className="muted">Only successfully recorded events appear here. Early versions may not contain every historical workspace change.</p>
      <p className="muted">New server-side audit writes require the private service-role configuration. Missing configuration can leave gaps; it never blocks the underlying workspace action.</p>
      {error ? <p className="notice notice-error">Audit history could not be loaded. Check database permissions and audit logging configuration.</p> :
       !events?.length ? <p className="muted">No matching audit events yet.</p> :
       <div className="table-wrap"><table><thead><tr><th>When</th><th>Action</th><th>Actor ID</th><th>Record</th><th>Details</th></tr></thead><tbody>
       {events.map(event => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</td><td><strong>{displayAction(event.action)}</strong></td><td><code>{event.actor_id ?? "System"}</code></td><td>{event.entity_type ?? "—"}{event.entity_id ? <><br/><code>{event.entity_id}</code></> : null}</td><td>{Object.entries(event.metadata ?? {}).slice(0, 6).map(([key, value]) => <div key={key}><span className="muted">{key.replace(/_/g, " ")}:</span> {String(value ?? "—").slice(0, 120)}</div>)}</td></tr>)}
       </tbody></table></div>}
    </section>
  </main>;
}
