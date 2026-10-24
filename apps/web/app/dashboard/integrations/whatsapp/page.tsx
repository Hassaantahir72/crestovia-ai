import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";
import { linkWhatsAppStaffSender, sendWhatsAppMessage, unlinkWhatsAppStaffSender } from "./actions";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Event = { id: string; direction: string; from_phone: string; to_phone: string; message_text: string; status: string; created_at: string };
type TeamMate = { user_id: string; role: string; display_name: string };
type StaffSender = { id: string; user_id: string; phone_e164: string; active: boolean };
const errors: Record<string,string> = {
  permission:"Only organization owners and admins can send WhatsApp messages.",
  invalid_message:"Enter a valid phone number with country code and a message.",
  not_configured:"WhatsApp Cloud API is not fully configured. Check the private Render environment variables.",
  provider_failed:"WhatsApp did not accept the message. Check the Meta app, recipient opt-in, token, phone number ID, and API version.",
  sent_log_failed:"The provider may have accepted the message, but the local event log failed. Check the ledger before retrying.",
  staff_mapping_invalid:"Choose an active team member and enter a phone number using 8–15 digits including country code.",
  staff_mapping_failed:"Could not save the staff phone mapping. The phone or team member may already be linked."
};
export default async function WhatsAppIntegrationPage({searchParams}:Props) {
  const params=await searchParams, supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) redirect("/login");
  const {membership}=await getActiveOrganizationMembership(supabase,user);
  if(!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase,membership.role);
  if(!["owner","admin"].includes(membership.role)) redirect("/dashboard");
  const configured=Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.WHATSAPP_APP_SECRET&&process.env.WHATSAPP_VERIFY_TOKEN&&process.env.WHATSAPP_API_VERSION&&process.env.WHATSAPP_ORGANIZATION_ID===membership.organization_id);
  const jarvisRepliesEnabled=process.env.WHATSAPP_AI_REPLY_ENABLED==="true";
  const {data:teamData}=await supabase.rpc("list_active_team_members",{p_organization_id:membership.organization_id});
  const teammates=((teamData??[]) as TeamMate[]).filter((person)=>person.user_id!==user.id);
  const {data:staffData,error:staffError}=await supabase.from("whatsapp_staff_senders").select("id,user_id,phone_e164,active").eq("organization_id",membership.organization_id).order("created_at",{ascending:false});
  const staffSenders=(staffData??[]) as StaffSender[];
  const {data:events,error:eventsError}=await supabase.from("whatsapp_message_events").select("id,direction,from_phone,to_phone,message_text,status,created_at").eq("organization_id",membership.organization_id).order("created_at",{ascending:false}).limit(50);
  const errorKey=typeof params.error==="string"?params.error:"";
  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/chat">Team chat</Link><Link href="/dashboard/assistant">AI assistant</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / INTEGRATIONS</p><h1>WhatsApp Cloud API</h1><p className="muted">Optional external messaging. Internal team channels and direct messages remain separate.</p></div><span className="role-pill">{configured?"credentials detected":"setup required"}</span></header>
    {params.sent==="1"?<p className="notice notice-success">WhatsApp accepted the message and the event was logged.</p>:null}
    {params.staff_linked==="1"?<p className="notice notice-success">Staff WhatsApp number linked.</p>:null}
    {params.staff_unlinked==="1"?<p className="notice notice-success">Staff WhatsApp number unlinked.</p>:null}
    {errorKey&&errors[errorKey]?<p className="notice notice-error">{errors[errorKey]}</p>:null}
    <section className="panel" style={{marginBottom:16}}><h2>Send a WhatsApp message</h2><p className="muted">Send only to recipients who opted in. Outside Meta’s customer-service window, approved templates may be required; this form sends text messages only.</p><form action={sendWhatsAppMessage} className="form-grid"><div><label htmlFor="wa-to">Recipient phone number</label><input className="input" id="wa-to" name="to" required maxLength={32} placeholder="923001234567" inputMode="tel"/></div><div style={{gridColumn:"1 / -1"}}><label htmlFor="wa-body">Message</label><textarea className="input" id="wa-body" name="body" required maxLength={4000} rows={4} placeholder="Write a short message…"/></div><div className="form-actions"><button className="button" type="submit">Send WhatsApp message</button></div></form></section>
    <section className="panel" style={{marginBottom:16}}><h2>Jarvis on WhatsApp</h2><p className="muted">{jarvisRepliesEnabled?"Direct AI replies are enabled for active staff numbers linked below.":"Direct AI replies are disabled. Set WHATSAPP_AI_REPLY_ENABLED=true privately in Render to enable replies for linked staff."}</p><p className="muted">Only numbers explicitly linked by an owner/admin to an active team account can receive replies. This responder answers general questions only; permission-scoped company data and consequential actions still require the signed-in workspace.</p><h3>Link a staff member</h3><form action={linkWhatsAppStaffSender} className="form-grid"><div><label htmlFor="wa-staff-user">Team member</label><select className="input" id="wa-staff-user" name="user_id" required defaultValue=""><option value="" disabled>Select active team member</option>{teammates.map(person=><option key={person.user_id} value={person.user_id}>{person.display_name} · {person.role}</option>)}</select></div><div><label htmlFor="wa-staff-phone">WhatsApp phone number</label><input className="input" id="wa-staff-phone" name="phone" required minLength={8} maxLength={15} pattern="[0-9]{8,15}" inputMode="tel" placeholder="923001234567"/></div><div className="form-actions"><button className="button" type="submit" disabled={!teammates.length}>Link staff number</button></div></form><h3>Linked staff numbers</h3>{staffError?<p className="notice notice-error">Staff mappings could not be loaded. Apply migration 0038 and verify database policies.</p>:staffSenders.length===0?<p className="muted">No staff numbers linked yet.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Team member</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>{staffSenders.map(sender=><tr key={sender.id}><td>{teammates.find(person=>person.user_id===sender.user_id)?.display_name??"Inactive or unavailable member"}</td><td><code>{sender.phone_e164}</code></td><td>{sender.active?"Active":"Disabled"}</td><td><form action={unlinkWhatsAppStaffSender}><input type="hidden" name="id" value={sender.id}/><button className="button button-secondary" type="submit">Unlink</button></form></td></tr>)}</tbody></table></div>}</section>
    <section className="panel" style={{marginBottom:16}}><h2>Webhook endpoint</h2><p className="muted">Configure Meta’s callback URL to this app’s /api/webhooks/whatsapp route and subscribe to the messages field. GET challenge verification uses the private verify token; POST requests require the Meta HMAC signature. Inbound events are stored in a separate company ledger.</p><code>/api/webhooks/whatsapp</code></section>
    <section className="panel"><h2>Recent WhatsApp events</h2><p className="muted">Latest 50 records for this organization.</p>{eventsError?<p className="notice notice-error">Event ledger unavailable. Apply migration 0038 and verify database privileges.</p>:!events?.length?<p className="muted">No WhatsApp events recorded yet.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>Direction</th><th>Phone</th><th>Message</th><th>Status</th><th>Received</th></tr></thead><tbody>{(events as Event[]).map(e=><tr key={e.id}><td>{e.direction}</td><td><code>{e.direction==="inbound"?e.from_phone:e.to_phone}</code></td><td>{e.message_text}</td><td>{e.status}</td><td>{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Karachi"}).format(new Date(e.created_at))}</td></tr>)}</tbody></table></div>}</section>
  </main>;
}
