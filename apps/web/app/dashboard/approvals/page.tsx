import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { emailProviderReadiness } from "@/lib/email/provider";
import { createApprovalRequest, reviewApprovalRequest, executeApprovedTaskRequest } from "../actions";
import { executeApprovedEmailRequest, testEmailProviderConnection } from "./email-actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ApprovalsPage({ searchParams }: Props) {
  const p = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: memberships } = await supabase.from("memberships").select("organization_id,role,organizations(name)").eq("user_id", user.id).eq("status", "active").limit(1);
  if (!memberships?.length) redirect("/onboarding");
  const m = memberships[0];
  await enforceOwnerMfa(supabase, m.role);
  const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
  const { data: requests } = await supabase.from("action_approval_requests")
    .select("id,requested_by,action_type,summary,details,status,review_note,created_at,reviewed_at,expires_at,execution_status,execution_result")
    .eq("organization_id", m.organization_id).order("created_at", { ascending: false }).limit(100);
  const owner = m.role === "owner";
  const emailReadiness = emailProviderReadiness();
  const requestIds = (requests ?? []).map((request) => request.id);
  const { data: deliveries } = owner && requestIds.length
    ? await supabase.from("email_delivery_attempts").select("approval_request_id,status,attempts,recipient_email,created_at,sent_at,last_error_code").eq("organization_id", m.organization_id).in("approval_request_id", requestIds)
    : { data: [] as { approval_request_id: string; status: string; attempts: number; recipient_email: string; created_at: string; sent_at: string | null; last_error_code: string | null }[] };
  const deliveryByRequest = new Map((deliveries ?? []).map((delivery) => [delivery.approval_request_id, delivery]));
  const errors: Record<string, string> = {
    invalid_action_type: "Choose a valid request type.",
    invalid_summary: "Summary must contain at least three characters.",
    request_failed: "Could not create the request.",
    execution_unavailable: "This request is not approved, has expired, or is unavailable.",
    unsupported_execution: "Only approved workspace task creation is executable in this release.",
    execution_already_started: "This request has already been claimed or executed.",
    execution_failed: "Task creation failed safely. Review the audit log before retrying.",
    owner_only: "Only the organization owner can review or execute requests.",
    invalid_decision: "Choose approve or reject.",
    request_not_pending: "That request is no longer pending or is outside your access.",
    email_provider_not_configured: "Email sending is disabled until RESEND_API_KEY and a valid RESEND_FROM_EMAIL are configured privately.",
    email_connection_failed: "Resend connection test failed. Check the private API key and provider account configuration.",
    email_payload_invalid: "Email details must be valid JSON with one recipient, a subject, and plain-text body.",
    email_request_unavailable: "This email request is not approved, has expired, or is unavailable.",
    email_already_started: "Email execution is already in progress or unavailable.",
    email_already_sent: "This approval already has a successful delivery record; no duplicate email was sent.",
    email_retry_limit: "Retry limit reached. Check the provider dashboard before taking further action.",
    email_ledger_failed: "Delivery tracking could not be saved, so the email was not sent.",
    email_delivery_failed: "Provider delivery failed or its result is uncertain. Review the delivery record before retrying."
  };
  const ek = typeof p.error === "string" ? p.error : "";
  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/assistant">AI assistant</Link><Link href="/dashboard/team">Team access</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / APPROVALS</p><h1>Action approvals</h1><p className="muted">{org?.name ?? "Workspace"} · Unsupported external actions remain disabled; the only external action currently implemented is owner-approved email delivery.</p></div></header>
    {p.created === "1" ? <p className="notice notice-success">Approval request submitted to the owner.</p> : null}
    {p.reviewed === "1" ? <p className="notice notice-success">Decision recorded.</p> : null}
    {p.executed === "1" ? <p className="notice notice-success">Approved workspace task created and recorded in the audit log.</p> : null}
    {p.email_sent === "1" ? <p className="notice notice-success">The email provider accepted the approved message. This confirms provider acceptance, not inbox delivery.</p> : null}
    {p.email_connection_ok === "1" ? <p className="notice notice-success">Resend API connection verified. This test did not send an email.</p> : null}
    {ek && errors[ek] ? <p className="notice notice-error">{errors[ek]}</p> : null}
    {owner ? <section className="panel" style={{ marginBottom: 18 }}><h2>Email provider</h2><p className="muted">{emailReadiness.ready ? "Resend settings are present. Configure a verified sender and validate the connection before live use." : "Email sending is disabled; missing private settings: " + emailReadiness.missing.join(", ") + "."}</p><p className="muted">Required server environment variables: RESEND_API_KEY and RESEND_FROM_EMAIL. Never expose them with NEXT_PUBLIC_ prefixes.</p><form action={testEmailProviderConnection} className="approval-review"><button className="button" type="submit" disabled={!emailReadiness.ready}>Test Resend connection (no email sent)</button></form></section> : null}
    {!owner ? <section className="panel" style={{ marginBottom: 18 }}><h2>Request approval</h2><p className="muted">Nothing executes until the owner reviews and approves it. For Send email, enter JSON in Details, for example: <code>{"{\\"to\\":\\"recipient@example.com\\",\\"subject\\":\\"Subject\\",\\"text\\":\\"Plain-text message\\"}"}</code>.</p>
      <form action={createApprovalRequest} className="form-grid">
        <div><label htmlFor="action_type">Request type</label><select className="input" id="action_type" name="action_type" defaultValue="external_write"><option value="create_task">Create workspace task</option><option value="external_write">External change</option><option value="send_email">Send email</option><option value="send_message">Send message</option><option value="calendar_change">Calendar change</option><option value="data_export">Data export</option><option value="other">Other</option></select></div>
        <div><label htmlFor="summary">Summary</label><input className="input" id="summary" name="summary" maxLength={200} required placeholder="What needs approval?"/></div>
        <div className="memory-content-field"><label htmlFor="details">Details</label><textarea className="input" id="details" name="details" rows={4} maxLength={4000} placeholder='For email: {"to":"recipient@example.com","subject":"Hello","text":"Message body"}'/></div>
        <div className="form-actions"><button className="button" type="submit">Submit for approval</button></div>
      </form>
    </section> : null}
    <section className="panel"><h2>{owner ? "Requests awaiting your review" : "Your approval requests"}</h2>
      {!requests?.length ? <p className="muted">No approval requests yet.</p> : <div className="task-list">{requests.map((r) => {
        const delivery = deliveryByRequest.get(r.id);
        const canExecute = owner && r.status === "approved" && new Date(r.expires_at).getTime() >= Date.now();
        return <article className="panel" key={r.id}>
          <div className="card-topline"><span className="status">{r.status === "pending" && new Date(r.expires_at).getTime() < Date.now() ? "expired" : r.status}</span><span className="status">{r.action_type.replaceAll("_", " ")}</span>{r.action_type === "create_task" || r.action_type === "send_email" ? <span className="status">Execution: {r.execution_status || "pending"}</span> : null}</div>
          <h3>{r.summary}</h3><p className="message-content">{r.details || "No additional details supplied."}</p>
          <p className="muted" style={{ fontSize: 12 }}>Requested by {r.requested_by === user.id ? "you" : r.requested_by.slice(0, 8) + "…"} · {new Date(r.created_at).toLocaleString()}</p>
          {r.execution_result ? <p className="muted" style={{ fontSize: 12 }}>{r.execution_result}</p> : null}
          {delivery ? <p className="muted" style={{ fontSize: 12 }}>Email delivery: {delivery.status} · attempts {delivery.attempts} · recipient {delivery.recipient_email}{delivery.last_error_code ? " · " + delivery.last_error_code : ""}</p> : null}
          {canExecute && r.action_type === "create_task" && r.execution_status === "pending" ? <form action={executeApprovedTaskRequest} className="approval-review"><input type="hidden" name="request_id" value={r.id}/><p className="muted">Creates one internal workspace task. No external service is contacted.</p><button className="button" type="submit">Execute approved task</button></form> : null}
          {canExecute && r.action_type === "send_email" && ["pending", "failed"].includes(r.execution_status || "pending") ? <form action={executeApprovedEmailRequest} className="approval-review"><input type="hidden" name="request_id" value={r.id}/><p className="muted">Sends one plain-text email to the single recipient explicitly recorded in the approved JSON details. Provider idempotency and a maximum of three attempts apply.</p><button className="button" type="submit" disabled={!emailReadiness.ready}>{emailReadiness.ready ? "Send approved email" : "Email provider not configured"}</button></form> : null}
          {r.status === "pending" && new Date(r.expires_at).getTime() >= Date.now() && owner ? <form action={reviewApprovalRequest} className="approval-review"><input type="hidden" name="request_id" value={r.id}/><label htmlFor={"review-note-" + r.id}>Decision note (optional)</label><input className="input" id={"review-note-" + r.id} name="review_note" maxLength={1000} placeholder="Reason or conditions"/><div className="action-links"><button className="button" name="decision" value="approved" type="submit">Approve request</button><button className="button button-danger" name="decision" value="rejected" type="submit">Reject request</button></div></form> : r.review_note ? <p className="muted">Review note: {r.review_note}</p> : null}
        </article>;
      })}</div>}
    </section>
  </main>;
}
