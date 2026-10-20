import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id,organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect("/onboarding");
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id,title,description,status,priority,due_at,created_at,projects(name)")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);

  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/projects">Projects</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / WORKSPACE</p><h1>Tasks</h1><p className="muted">{organization?.name ?? "Your organization"} · Task tracking</p></div></header>
    {error ? <section className="panel"><h2>Tasks are not available yet</h2><p className="muted">Apply <code>database/migrations/0002_company_workspace.sql</code> after the foundation migration. If it is already applied, verify organization membership and RLS policies.</p></section> : !tasks?.length ? <section className="panel empty-state"><h2>Your task board is ready</h2><p className="muted">No tasks found yet. The schema supports task status, priority, due dates, project links, assignees, and comments. Creation and editing forms are the next step.</p><Link className="button" href="/dashboard/projects">Explore projects</Link></section> : <section className="task-list">{tasks.map((task) => { const project = Array.isArray(task.projects) ? task.projects[0] : task.projects; return <article className="panel task-row" key={task.id}><div className="task-main"><h2>{task.title}</h2><p className="muted">{task.description || "No description"}{project?.name ? ` · ${project.name}` : ""}</p></div><div className="task-meta"><span className={`status status-${task.status}`}>{task.status.replaceAll("_", " ")}</span><span className={`priority priority-${task.priority}`}>{task.priority}</span><span className="muted">{task.due_at ? new Date(task.due_at).toLocaleDateString() : "No due date"}</span></div></article>; })}</section>}
  </main>;
}
