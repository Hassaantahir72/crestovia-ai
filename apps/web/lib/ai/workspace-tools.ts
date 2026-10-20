import type { SupabaseClient } from "@supabase/supabase-js";

type ToolContext = { supabase: SupabaseClient; organizationId: string; userId: string };
type ReadOnlyTool = {
  name: string;
  description: string;
  mode: "read_only";
  matches: (message: string) => boolean;
  execute: (context: ToolContext) => Promise<string>;
};

function safeText(value: unknown, max = 180): string {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, max);
}

async function workspaceOverview({ supabase, organizationId }: ToolContext): Promise<string> {
  const [tasksResult, projectsResult, approvalsResult] = await Promise.all([
    supabase.from("tasks").select("title,status,priority,due_at").eq("organization_id", organizationId).in("status", ["todo", "in_progress", "blocked", "in_review"]).order("due_at", { ascending: true, nullsFirst: false }).limit(100),
    supabase.from("projects").select("name,status,priority,due_date").eq("organization_id", organizationId).in("status", ["planned", "active", "on_hold"]).order("due_date", { ascending: true, nullsFirst: false }).limit(40),
    supabase.from("action_approval_requests").select("summary,action_type,status,expires_at").eq("organization_id", organizationId).eq("status", "pending").order("created_at", { ascending: false }).limit(20),
  ]);
  const tasks = tasksResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const now = Date.now();
  const activeApprovals = (approvalsResult.data ?? []).filter(item => new Date(item.expires_at).getTime() > now);
  const overdue = tasks.filter(task => task.due_at && new Date(task.due_at).getTime() < now && !["done", "cancelled"].includes(task.status));
  const unavailableSections = [tasksResult.error ? "tasks" : "", projectsResult.error ? "projects" : "", approvalsResult.error ? "pending approvals" : ""].filter(Boolean);
  const payload = {
    tool: "workspace_overview",
    unavailable_sections: unavailableSections,
    warning: unavailableSections.length ? "Some workspace sections could not be read under the current permissions. Do not treat missing sections as zero." : undefined,
    access: "authenticated Supabase client; database row-level security applies",
    counts: {
      visible_open_tasks_in_result_window: tasksResult.error ? null : tasks.length,
      overdue_tasks_in_returned_window: tasksResult.error ? null : overdue.length,
      blocked_tasks: tasksResult.error ? null : tasks.filter(task => task.status === "blocked").length,
      in_progress_tasks: tasksResult.error ? null : tasks.filter(task => task.status === "in_progress").length,
      visible_open_projects_in_result_window: projectsResult.error ? null : projects.length,
      unexpired_pending_approval_requests: approvalsResult.error ? null : activeApprovals.length,
    },
    tasks: tasks.slice(0, 12).map(task => ({ title: safeText(task.title), status: task.status, priority: task.priority, due_at: task.due_at })),
    projects: projects.slice(0, 8).map(project => ({ name: safeText(project.name), status: project.status, priority: project.priority, due_date: project.due_date })),
    pending_approvals: activeApprovals.slice(0, 8).map(item => ({ summary: safeText(item.summary), type: item.action_type, expires_at: item.expires_at })),
    limits: "Queries are capped; counts describe returned visible records, not necessarily the full database.",
  };
  return JSON.stringify(payload);
}

async function myAssignedTasks({ supabase, organizationId, userId }: ToolContext): Promise<string> {
  const { data, error } = await supabase.from("tasks").select("title,status,priority,due_at").eq("organization_id", organizationId).eq("assigned_to", userId).order("due_at", { ascending: true, nullsFirst: false }).limit(100);
  if (error) return JSON.stringify({ tool: "my_assigned_tasks", unavailable: true, message: "Assigned tasks could not be loaded under the current account permissions." });
  const openTasks = (data ?? []).filter(task => !["done", "cancelled"].includes(task.status));
  return JSON.stringify({
    tool: "my_assigned_tasks",
    access: "authenticated Supabase client; database row-level security applies",
    count: openTasks.length,
    tasks: openTasks.slice(0, 20).map(task => ({ title: safeText(task.title), status: task.status, priority: task.priority, due_at: task.due_at })),
    limits: "At most 100 visible assigned tasks were checked.",
  });
}

const READ_ONLY_TOOL_REGISTRY: ReadOnlyTool[] = [
  {
    name: "workspace_overview",
    description: "Read visible workspace task, project, and pending approval summaries.",
    mode: "read_only",
    matches: message => /\b(workspace|company|project|projects|task|tasks|deadline|deadlines|blocked|in progress|approval|approvals|team status|work status|briefing)\b/i.test(message),
    execute: workspaceOverview,
  },
  {
    name: "my_assigned_tasks",
    description: "Read the signed-in user's assigned open tasks.",
    mode: "read_only",
    matches: message => /\b(my tasks|tasks assigned to me|assigned to me|what should i work on|my deadlines)\b/i.test(message),
    execute: myAssignedTasks,
  },
];

export async function runReadOnlyAssistantTools(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  latestMessage: string,
): Promise<string> {
  const matching = READ_ONLY_TOOL_REGISTRY.filter(tool => tool.mode === "read_only" && tool.matches(latestMessage));
  if (!matching.length) return "";
  const results = await Promise.all(matching.map(async tool => {
    try {
      return await tool.execute({ supabase, organizationId, userId });
    } catch {
      return JSON.stringify({ tool: tool.name, unavailable: true, message: "Read-only workspace data could not be loaded." });
    }
  }));
  return results.join("\n");
}
