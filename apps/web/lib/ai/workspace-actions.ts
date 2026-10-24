import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAuditEvent } from "@/lib/security/audit";

type CommandResult = { handled: false } | { handled: true; reply: string };
type TaskStatus = "todo" | "in_progress" | "blocked" | "in_review" | "done" | "cancelled";

function normalize(value: string) {
  return value.trim().replace(/^["'“”]+|["'“”]+$/g, "").replace(/\s+/g, " ");
}

/**
 * Executes only explicit, narrow task commands. Everything else stays with the
 * conversational assistant. All reads/writes are scoped to the active org.
 */
export async function runWorkspaceCommand(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  message: string,
): Promise<CommandResult> {
  const text = message.trim();
  const createMatch = text.match(/^(?:please\s+)?(?:create|add|make|set\s+up)\s+(?:a\s+)?task(?:\s+(?:called|named))?\s*[:—-]?\s+(.+)$/i);
  if (createMatch) {
    let title = normalize(createMatch[1]);
    const priorityMatch = title.match(/\s+priority\s*[:=]?\s*(low|medium|high|urgent)\s*$/i);
    const priority = (priorityMatch?.[1]?.toLowerCase() ?? "medium") as "low" | "medium" | "high" | "urgent";
    if (priorityMatch) title = title.slice(0, priorityMatch.index).trim();
    title = title.replace(/\s+(?:with\s+)?(?:high|medium|low|urgent)\s+priority$/i, "").trim();
    if (title.length < 2 || title.length > 200) {
      return { handled: true, reply: "Please give me a task title between 2 and 200 characters. Example: “Create task: Prepare the Business Development outreach plan.”" };
    }
    const { data: created, error } = await supabase.from("tasks").insert({
      organization_id: organizationId,
      title,
      description: "",
      priority,
      created_by: userId,
      assigned_to: null,
    }).select("id,title,priority").single();
    if (error || !created) {
      return { handled: true, reply: "I couldn't create that task because the workspace rejected the change. Nothing was reported as completed. Please check your task permissions and try again." };
    }
    await recordAuditEvent({
      organizationId,
      actorId: userId,
      action: "task.created_by_assistant",
      entityType: "task",
      entityId: created.id,
      metadata: { title: created.title, priority: created.priority, source: "assistant_command" },
    });
    return { handled: true, reply: `Done — I created “${created.title}” in your company task board with ${created.priority} priority. It is currently unassigned. If you want, tell me who should own it and when it is due.` };
  }

  const statusMatch = text.match(/^(?:please\s+)?(?:mark|set|move|update)\s+(?:the\s+)?task\s+["'“]?(.+?)["'”]?\s+(?:as\s+)?(to do|todo|in progress|blocked|in review|done|completed|cancelled|canceled)$/i);
  if (statusMatch) {
    const title = normalize(statusMatch[1]);
    const rawStatus = statusMatch[2].toLowerCase().replace(/\s+/g, "_");
    const status: TaskStatus = rawStatus === "completed" ? "done" : rawStatus === "canceled" ? "cancelled" : rawStatus === "to_do" ? "todo" : rawStatus as TaskStatus;
    const { data: matches, error: lookupError } = await supabase.from("tasks")
      .select("id,title,status")
      .eq("organization_id", organizationId)
      .eq("title", title)
      .limit(3);
    if (lookupError) return { handled: true, reply: "I couldn't check the task list, so I did not change anything." };
    if (!matches?.length) return { handled: true, reply: `I couldn't find a task titled “${title}” in this workspace. No changes were made. Check the exact task title and try again.` };
    if (matches.length !== 1) return { handled: true, reply: `I found more than one task matching “${title}”. To avoid changing the wrong one, open the task board and use the exact unique title.` };
    const target = matches[0];
    const { data: updated, error } = await supabase.from("tasks")
      .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", target.id).eq("organization_id", organizationId)
      .select("id,title,status").maybeSingle();
    if (error || !updated) return { handled: true, reply: "The workspace did not confirm the task update, so I can't say it was changed. Please check the task board." };
    await recordAuditEvent({
      organizationId,
      actorId: userId,
      action: "task.status.updated_by_assistant",
      entityType: "task",
      entityId: updated.id,
      metadata: { status: updated.status, source: "assistant_command" },
    });
    return { handled: true, reply: `Done — “${updated.title}” is now marked ${updated.status.replaceAll("_", " ")}.` };
  }

  return { handled: false };
}
