import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id,role,organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect("/onboarding");
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,name,description,status,priority,due_date,created_at")
    .eq("organization_id", membership.organization_id)
    .order("updated_at", { ascending: false });

  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/tasks">Tasks</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / WORKSPACE</p><h1>Projects</h1><p className="muted">{organization?.name ?? "Your organization"} · Shared project portfolio</p></div></header>
    {error ? <section className="panel"><h2>Projects are not available yet</h2><p className="muted">Apply <code>database/migrations/0002_company_workspace.sql</code> after the foundation migration. If you have already applied it, check the Supabase error details and your membership.</p></section> : !projects?.length ? <section className="panel empty-state"><h2>No projects yet</h2><p className="muted">This workspace is ready for projects. Project creation forms and team assignment are part of the next implementation increment.</p><Link className="button" href="/dashboard/tasks">View tasks workspace</Link></section> : <section className="grid">{projects.map((project) => <article className="panel" key={project.id}><div className="card-topline"><span className={`status status-${project.status}`}>{project.status.replaceAll("_", " ")}</span><span className={`priority priority-${project.priority}`}>{project.priority}</span></div><h2>{project.name}</h2><p className="muted">{project.description || "No description added."}</p><p className="muted">Due: {project.due_date ?? "Not scheduled"}</p></article>)}</section>}
  </main>;
}
