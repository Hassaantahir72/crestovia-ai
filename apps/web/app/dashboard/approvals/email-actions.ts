"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { recordAuditEvent } from "@/lib/security/audit";
import { consumeUserRateLimit } from "@/lib/security/rate-limit";
import { emailProviderReadiness, sendApprovedEmail, validateApprovedEmailPayload, type ApprovedEmailPayload } from "@/lib/email/provider";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";

async function ownerContext() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership || membership.role !== "owner") redirect("/dashboard/approvals?error=owner_only");
  await enforceOwnerMfa(supabase, membership.role);
  return { supabase, user, membership };
}

function field(data: FormData, name: string) { return String(data.get(name) ?? "").trim().slice(0, 64); }

export async function executeApprovedEmailRequest(data: FormData) {
  const { supabase, user, membership } = await ownerContext();
  const id = field(data, "request_id");
  if (!id) redirect("/dashboard/approvals?error=email_request_unavailable");
  if (!emailProviderReadiness().ready) redirect("/dashboard/approvals?error=email_provider_not_configured");

  const { data: request, error: requestError } = await supabase.from("action_approval_requests")
    .select("id,organization_id,requested_by,action_type,details,status,expires_at")
    .eq("id", id).eq("organization_id", membership.organization_id).maybeSingle();
  if (requestError || !request || request.action_type !== "send_email" || request.status !== "approved" ||
      new Date(request.expires_at).getTime() <= Date.now()) redirect("/dashboard/approvals?error=email_request_unavailable");
  const parsedPayload: { ok: true; payload: ApprovedEmailPayload } | { ok: false } = (() => {
    try { return { ok: true, payload: validateApprovedEmailPayload(request.details) }; }
    catch { return { ok: false }; }
  })();
  const payload: ApprovedEmailPayload = "payload" in parsedPayload
    ? parsedPayload.payload
    : (() => {
        redirect("/dashboard/approvals?error=email_payload_invalid");
        throw new Error("EMAIL_PAYLOAD_INVALID");
      })();

  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin.from("action_approval_requests")
    .update({ execution_status: "running", execution_started_at: new Date().toISOString(), execution_result: "Email delivery in progress." })
    .eq("id", id).eq("organization_id", membership.organization_id).eq("action_type", "send_email")
    .eq("status", "approved").gt("expires_at", new Date().toISOString())
    .in("execution_status", ["pending", "failed"]).select("id,requested_by").maybeSingle();
  if (claimError || !claimed) redirect("/dashboard/approvals?error=email_already_started");

  const { data: prior } = await admin.from("email_delivery_attempts").select("id,status,attempts,created_at")
    .eq("approval_request_id", id).maybeSingle();
  if (prior?.status === "sent") {
    await admin.from("action_approval_requests").update({ execution_status: "succeeded", execution_completed_at: new Date().toISOString(), execution_result: "Email delivery was already recorded as sent." }).eq("id", id).eq("organization_id", membership.organization_id);
    redirect("/dashboard/approvals?error=email_already_sent");
  }
  const attempts = (prior?.attempts ?? 0) + 1;
  const ageMs = prior ? Date.now() - new Date(prior.created_at).getTime() : 0;
  if (attempts > 3 || (prior && ageMs > 23 * 60 * 60 * 1000)) {
    await admin.from("action_approval_requests").update({ execution_status: "failed", execution_completed_at: new Date().toISOString(), execution_result: "Retry window or attempt limit reached; reconcile provider status before further action." }).eq("id", id).eq("organization_id", membership.organization_id);
    redirect("/dashboard/approvals?error=email_retry_limit");
  }

  const idempotencyKey = "crestovia-approval-email-" + id;
  const now = new Date().toISOString();
  const deliveryValues = {
    organization_id: membership.organization_id, approval_request_id: id, requested_by: request.requested_by,
    sent_by: user.id, recipient_email: payload.to, subject: payload.subject, status: "sending",
    attempts, last_error_code: null, idempotency_key: idempotencyKey, updated_at: now
  };
  const { error: ledgerError } = await admin.from("email_delivery_attempts").upsert(deliveryValues, { onConflict: "approval_request_id" });
  if (ledgerError) {
    await admin.from("action_approval_requests").update({ execution_status: "failed", execution_completed_at: now, execution_result: "Delivery ledger unavailable; email was not sent." }).eq("id", id).eq("organization_id", membership.organization_id);
    await recordAuditEvent({ organizationId: membership.organization_id, actorId: user.id, action: "approval.email_ledger_failed", entityType: "action_approval_request", entityId: id });
    redirect("/dashboard/approvals?error=email_ledger_failed");
  }

  try {
    const result = await sendApprovedEmail(payload, idempotencyKey);
    const sentAt = new Date().toISOString();
    await admin.from("email_delivery_attempts").update({ status: "sent", provider_message_id: result.id, last_error_code: null, sent_at: sentAt, updated_at: sentAt }).eq("approval_request_id", id);
    await admin.from("action_approval_requests").update({ execution_status: "succeeded", execution_completed_at: sentAt, execution_result: "Email accepted by provider for " + payload.to + "." }).eq("id", id).eq("organization_id", membership.organization_id);
    await recordAuditEvent({ organizationId: membership.organization_id, actorId: user.id, action: "approval.email.sent", entityType: "action_approval_request", entityId: id, metadata: { recipient_domain: payload.to.split("@")[1], provider: "resend" } });
    revalidatePath("/dashboard/approvals");
    redirect("/dashboard/approvals?email_sent=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error && /^EMAIL_PROVIDER_REJECTED_\d{3}$/.test(error.message) ? error.message : "EMAIL_DELIVERY_UNCERTAIN";
    const failedAt = new Date().toISOString();
    await admin.from("email_delivery_attempts").update({ status: "failed", last_error_code: code, updated_at: failedAt }).eq("approval_request_id", id);
    await admin.from("action_approval_requests").update({ execution_status: "failed", execution_completed_at: failedAt, execution_result: "Email delivery failed or is uncertain; retry is limited to 3 attempts within 23 hours." }).eq("id", id).eq("organization_id", membership.organization_id);
    await recordAuditEvent({ organizationId: membership.organization_id, actorId: user.id, action: "approval.email.failed", entityType: "action_approval_request", entityId: id, metadata: { error_code: code, attempt: attempts } });
    redirect("/dashboard/approvals?error=email_delivery_failed");
  }
}


export async function testEmailProviderConnection() {
  const { user, membership } = await ownerContext();
  let testAllowed = false;
  try {
    testAllowed = await consumeUserRateLimit(user.id, "email_provider_test_minute", 3, 60)
      && await consumeUserRateLimit(user.id, "email_provider_test_hour", 10, 3600);
  } catch {
    redirect("/dashboard/approvals?error=email_connection_rate_limit_unavailable");
  }
  if (!testAllowed) redirect("/dashboard/approvals?error=email_connection_rate_limited");
  const readiness = emailProviderReadiness();
  if (!readiness.ready) redirect("/dashboard/approvals?error=email_provider_not_configured");
  try {
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      await recordAuditEvent({ organizationId: membership.organization_id, actorId: user.id, action: "email_provider.connection_test_failed", entityType: "integration", metadata: { provider: "resend", status: response.status } });
      redirect("/dashboard/approvals?error=email_connection_failed");
    }
    await recordAuditEvent({ organizationId: membership.organization_id, actorId: user.id, action: "email_provider.connection_test_succeeded", entityType: "integration", metadata: { provider: "resend" } });
    revalidatePath("/dashboard/approvals");
    redirect("/dashboard/approvals?email_connection_ok=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    await recordAuditEvent({ organizationId: membership.organization_id, actorId: user.id, action: "email_provider.connection_test_failed", entityType: "integration", metadata: { provider: "resend", status: "network_or_timeout" } });
    redirect("/dashboard/approvals?error=email_connection_failed");
  }
}
