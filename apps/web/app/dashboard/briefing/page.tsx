import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";

type Task = {
  id: string; title: string; status: string; priority: string; due_at: string | null;
  assigned_to: string | null; projects: { name: string } | { name: string }[] | null;
};
type Project = { id: string; name: string; status: string; priority: string; due_date: string | null };
type Approval = { id: string; summary: string; action_type: string; status: string; created_at: string; expires_at: string };
type Activity = { id: string; action: string; summary: string; entity_type: string; created_at: string };

function dateKey(value: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function formatDate(value: string, timezone: string) {
  try { return new Intl.DateTimeFormat("en", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return new Date(value).toLocaleString(); }
}
function projectName(task: Task) {
  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
  return project?.name ?? "No project";
}
function TaskGroup({ title, items, timezone, empty }: { title: string; items: Task[]; timezone: string; empty: string }) {
  return <section className="panel briefing-panel"><div className="briefing-section-heading"><h2>{title}</h2><span className="status">{items.length}</span></div>{!items.length ? <p className="muted">{empty}</p> : <div className="briefing-task-list">{items.map(task => <article className="briefing-task" key={task.id}><div><strong>{task.title}</strong><p className="muted small">{projectName(task)} · {task.status.replaceAll("_", " ")}</p></div><div className="briefing-task-meta"><span className={`priority priority-${task.priority}`}>{task.priority}</span>{task.due_at ? <span className="muted small">{formatDate(task.due_at, timezone)}</span> : null}<Link href="/dashboard/tasks">Open tasks</Link></div></article>)}</div>}</section>;
}

export default async function DailyBriefingPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: memberships } = await supabase.from("memberships").select("organization_id,role,organizations(name)").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: true });
  if (!memberships?.length) redirect("/onboarding");
  await enforceOwnerMfa(supabase, memberships.some(m => m.role === "owner") ? "owner" : memberships[0].role);
  const membership = memberships[0];
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", user.id).maybeSingle();
  let timezone = profile?.timezone || "Asia/Karachi";
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { timezone = "Asia/Karachi"; }
  const now = new Date();
  const today = dateKey(now, timezone);
  const sevenDays = dateKey(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), timezone);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: rawTasks }, { data: projects }, { data: approvals }, { data: activity }] = await Promise.all([
    supabase.from("tasks").select("id,title,status,priority,due_at,assigned_to,projects(name)").eq("organization_id", membership.organization_id).in("status", ["todo", "in_progress", "blocked", "in_review"]).order("due_at", { ascending: true, nullsFirst: false }).limit(200),
    supabase.from("projects").select("id,name,status,priority,due_date").eq("organization_id", membership.organization_id).in("status", ["planned", "active", "on_hold"]).order("due_date", { ascending: true, nullsFirst: false }).limit(100),
    supabase.from("action_approval_requests").select("id,summary,action_type,status,created_at,expires_at").eq("organization_id", membership.organization_id).eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    supabase.from("workspace_activity").select("id,action,summary,entity_type,created_at").eq("organization_id", membership.organization_id).gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(8),
  ]);
  const tasks = (rawTasks ?? []) as Task[];
  const overdue = tasks.filter(task => task.due_at && dateKey(new Date(task.due_at), timezone) < today);
  const dueToday = tasks.filter(task => task.due_at && dateKey(new Date(task.due_at), timezone) === today);
  const dueSoon = tasks.filter(task => { if (!task.due_at) return false; const key = dateKey(new Date(task.due_at), timezone); return key > today && key <= sevenDays; });
  const blocked = tasks.filter(task => task.status === "blocked");
  const inProgress = tasks.filter(task => task.status === "in_progress");
  const activeProjects = ((projects ?? []) as Project[]).filter(project => project.status === "active");
  const pendingApprovals = ((approvals ?? []) as Approval[]).filter(item => new Date(item.expires_at).getTime() > now.getTime());
  const expiredApprovals = ((approvals ?? []) as Approval[]).filter(item => new Date(item.expires_at).getTime() <= now.getTime());
  const urgent = [...overdue, ...dueToday, ...blocked].filter((task, index, all) => all.findIndex(item => item.id === task.id) === index);

  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/tasks">Tasks</Link><Link href="/dashboard/projects">Projects</Link><Link href="/dashboard/assistant">AI assistant</Link><Link href="/dashboard/approvals">Approvals</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / DAILY BRIEFING</p><h1>Your day at a glance</h1><p className="muted">{organization?.name ?? "Your workspace"} · {new Intl.DateTimeFormat("en", { timeZone: timezone, dateStyle: "full" }).format(now)} · {timezone}</p></div><Link className="button button-secondary" href="/dashboard/tasks">Open task board</Link></header>
    <section className="briefing-summary"><article className="panel briefing-hero"><p className="eyebrow">TODAY&apos;S PRIORITIES</p><h2>{overdue.length ? `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"} need attention` : dueToday.length ? `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} due today` : blocked.length ? `${blocked.length} blocked item${blocked.length === 1 ? "" : "s"} to unblock` : "No overdue work detected"}</h2><p className="muted">This briefing is generated from the workspace data your account is allowed to see. It does not use AI or trigger any actions.</p><div className="action-links"><Link className="button" href="/dashboard/tasks">Review tasks</Link><Link className="button button-secondary" href="/dashboard/assistant">Ask your assistant</Link></div></article>
      <div className="briefing-metrics"><article className="panel"><span className="muted">Overdue</span><strong className="metric-number">{overdue.length}</strong></article><article className="panel"><span className="muted">Due today</span><strong className="metric-number">{dueToday.length}</strong></article><article className="panel"><span className="muted">Blocked</span><strong className="metric-number">{blocked.length}</strong></article><article className="panel"><span className="muted">In progress</span><strong className="metric-number">{inProgress.length}</strong></article></div>
    </section>
    <section className="briefing-columns">
      <div className="briefing-main"><TaskGroup title="Needs attention" items={urgent} timezone={timezone} empty="No overdue, due-today, or blocked tasks were found in your visible workspace."/><TaskGroup title="Due in the next 7 days" items={dueSoon} timezone={timezone} empty="No visible tasks are due in the next seven days."/><TaskGroup title="In progress" items={inProgress} timezone={timezone} empty="No tasks are currently marked in progress."/></div>
      <aside className="briefing-side">
        <section className="panel briefing-panel"><div className="briefing-section-heading"><h2>Projects</h2><span className="status">{activeProjects.length} active</span></div>{!projects?.length ? <p className="muted">No visible open projects.</p> : <div className="briefing-task-list">{(projects as Project[]).slice(0, 8).map(project => <article className="briefing-project" key={project.id}><div className="card-topline"><span className={`status status-${project.status}`}>{project.status.replaceAll("_", " ")}</span><span className={`priority priority-${project.priority}`}>{project.priority}</span></div><strong>{project.name}</strong><p className="muted small">Due: {project.due_date ?? "Not scheduled"}</p></article>)}</div>}<Link className="text-link" href="/dashboard/projects">View projects →</Link></section>
        <section className="panel briefing-panel"><div className="briefing-section-heading"><h2>Approval requests</h2><span className="status">{pendingApprovals.length} pending</span></div>{pendingApprovals.length ? <div className="briefing-task-list">{pendingApprovals.slice(0, 5).map(item => <article className="briefing-project" key={item.id}><strong>{item.summary}</strong><p className="muted small">{item.action_type.replaceAll("_", " ")} · {formatDate(item.created_at, timezone)}</p></article>)}</div> : <p className="muted">No unexpired approval requests are waiting.</p>}{expiredApprovals.length ? <p className="muted small">{expiredApprovals.length} pending record(s) have expired and cannot be approved.</p> : null}<Link className="text-link" href="/dashboard/approvals">Open approvals →</Link></section>
        <section className="panel briefing-panel"><div className="briefing-section-heading"><h2>Recent workspace activity</h2><span className="muted small">7 days</span></div>{!activity?.length ? <p className="muted">No recent activity is visible yet.</p> : <div className="briefing-task-list">{(activity as Activity[]).map(item => <article className="briefing-project" key={item.id}><strong>{item.summary || item.action.replaceAll("_", " ")}</strong><p className="muted small">{item.entity_type} · {formatDate(item.created_at, timezone)}</p></article>)}</div>}</section>
      </aside>
    </section>
    <p className="muted small briefing-footnote">Counts reflect up to 200 visible open tasks, 100 visible open projects, and the most recent 50 pending approval records. Your project assignments and database access rules determine what appears here.</p>
  </main>;
}
