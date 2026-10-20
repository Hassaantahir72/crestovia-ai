"use server";

type AuditEvent = {
  organizationId: string;
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

/** Server-only best-effort audit writer. Never include secrets, comment bodies, or long free-text content. */
export async function recordAuditEvent(event: AuditEvent): Promise<boolean> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      organization_id: event.organizationId,
      actor_id: event.actorId,
      action: event.action,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      metadata: event.metadata ?? {},
    });
    return !error;
  } catch {
    return false;
  }
}
