import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";
import { sendWhatsAppMessage } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Event = { id: string; direction: string; from_phone: string; to_phone: string; message_text: string; status: string; created_at: string };

const errors: Record<string, string> = {
  permission: "Only organization owners and admins can send WhatsApp messages.",
  invalid_message: "Enter a valid phone number with country code and a message.",
  not_configured: "WhatsApp Cloud API is not fully configured for this organization. Check the private Render environment variables.",
  provider_failed: "WhatsApp did not accept the message. Check the Meta app, recipient opt-in, token, phone number ID, and API version.",
  sent_log_failed: "The provider may have accepted the message, but the local audit record failed. Check the WhatsApp event table before retrying to avoid duplicate sends.",
};

export default async function WhatsAppIntegrationPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase, membership.role);
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard");
  const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_API_VERSION && process.env.WHATSAPP_ORGANIZATION_ID === membership.organization_id);
  const { data: events, error: eventsError } = await supabase.from("whatsapp_message_events").select("id,direction,from_phone,to_phone,message_text,status,created_at").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(50);
  const errorKey = typeof params.error === "string" ? params.error : "";
  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/team-chat">Team chat</Link><Link href="/dashboard/assistant">AI assistant</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / INTEGRATIONS</p><h1>WhatsApp Cloud API</h1><p className="muted">Optional external messaging for approved company communication. Internal team chat remains separate.</p></div><span className="role-pill">{configured ? "credentials detected" : "setup required"}</span></header>
    {params.sent === "1" ? <p className="notice notice-success">WhatsApp accepted the message and the event was logged.</p> : null}
    {errorKey && errors[errorKey] ? <p className="notice notice-error">{errors[errorKey]}</p> : null}
    <section className="panel" style={{ marginBottom: 16 }}><h2>Send a WhatsApp message</h2><p className="muted">Only send messages to recipients who have consented to receive them. Outside the customer-service window, Meta-approved templates may be required; this form sends text messages only.</p><form action={sendWhatsAppMessage} className="form-grid"><div><label htmlFor="wa-to">Recipient phone number</label><input className="input" id="wa-to" name="to" required maxLength={32} placeholder="923001234567" inputMode="tel"/></div><div style={{ gridColumn: "1 / -1" }}><label htmlFor="wa-body">Message</label><textarea className="input" id="wa-body" name="body" required maxLength={4000} rows={4} placeholder="Write a short message…"/></div><div className="form-actions"><button className="button" type="submit">Send WhatsApp message</button></div></form></section>
    <section className="panel" style={{ marginBottom: 16 }}><h2>Webhook endpoint</h2><p className="muted">Configure the Meta webhook callback URL to this app’s /api/webhooks/whatsapp route and subscribe to the messages field. The GET challenge is verified with the private verify token; POST events require a valid HMAC signature. Inbound text events are recorded in the organization’s WhatsApp ledger, separate from internal chats.</p><code>/api/webhooks/whatsapp</code></section>
    <section className="panel"><div className="card-topline"><div><h2>Recent WhatsApp events</h2><p className="muted">Latest 50 inbound and outbound records for this organization.</p></div></div>
      {eventsError ? <p className="notice notice-error">Event ledger unavailable. Apply migration 0034 and verify database privileges.</p> : !events?.length ? <p className="muted">No WhatsApp events recorded yet.</p> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Direction</th><th>Phone</th><th>Message</th><th>Status</th><th>Received</th></tr></thead><tbody>{(events as Event[]).map((event) => <tr key={event.id}><td>{event.direction}</td><td><code>{event.direction === "inbound" ? event.from_phone : event.to_phone}</code></td><td>{event.message_text}</td><td>{event.status}</td><td>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(event.created_at))}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
