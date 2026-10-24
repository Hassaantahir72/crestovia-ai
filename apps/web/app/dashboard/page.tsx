import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {SignOutButton} from "./sign-out-button";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
import {cookies} from "next/headers";
import {ACTIVE_ORGANIZATION_COOKIE} from "@/lib/organizations/active-membership";
import {selectActiveOrganization} from "./organization-actions";

export default async function DashboardPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("organization_id,role,status,organizations(id,name,slug)").eq("user_id",user.id).eq("status","active");
 if(!memberships?.length)redirect("/onboarding");
 const cookieStore=await cookies();
 const preferredOrganizationId=cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
 const selectedMembership=memberships.find(m=>m.organization_id===preferredOrganizationId)??memberships[0];
 await enforceOwnerMfa(supabase,selectedMembership.role);
 const isOwner=selectedMembership.role==="owner";
 const canViewAudit=selectedMembership.role==="owner"||selectedMembership.role==="admin";
 const selectedOrg=Array.isArray(selectedMembership.organizations)?selectedMembership.organizations[0]:selectedMembership.organizations;
 const displayName=(user.user_metadata?.full_name as string|undefined)?.trim()||user.email?.split("@")[0]||"there";
 return <main className="container">
  <header className="overview-header">
   <div className="overview-heading">
    <p className="brand">CRESTOVIA / WORKSPACE</p>
    <h1>Good to see you, {displayName}.</h1>
    <p className="muted">Your company’s work, people, and AI—together in one focused workspace.</p>
   </div>
   <div className="overview-actions"><a className="button button-secondary" href="/dashboard/briefing">Today’s briefing ↗</a><a className="button" href="/dashboard/assistant">Open Crestovia AI ↗</a></div>
  </header>

  <section className="overview-grid" aria-label="Workspace overview">
   <article className="panel overview-card overview-card-wide overview-hero">
    <div><p className="overview-small-label">YOUR WORKSPACE</p><h2>A clearer view of work. A smarter way to move it forward.</h2><p className="muted">Use Crestovia to coordinate your team, organize projects, manage tasks, and get help from your private AI assistant.</p></div>
    <div className="overview-actions"><a className="button" href="/dashboard/tasks">Go to tasks</a><a className="button button-secondary" href="/dashboard/projects">Explore projects</a></div>
   </article>

   <article className="panel overview-card">
    <div className="overview-card-heading"><span className="overview-icon" aria-hidden="true">⌘</span><div><h2>Organization</h2><p className="muted">Your active company space</p></div></div>
    <div className="overview-org"><strong>{selectedOrg?.name??"Your organization"}</strong><p><span className="role-pill">{selectedMembership.role}</span></p><p className="muted" style={{marginTop:10}}>Signed in as {user.email}</p></div>
    {memberships.length>1?<form action={selectActiveOrganization} style={{marginTop:14}}><label htmlFor="organization_id">Switch workspace</label><select className="input" id="organization_id" name="organization_id" defaultValue={selectedMembership.organization_id}>{memberships.map((m,i)=>{const org=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;return <option key={(org?.id??"org")+"-"+i} value={m.organization_id}>{org?.name??"Organization"} · {m.role}</option>})}</select><button className="button button-secondary" type="submit">Switch workspace</button></form>:null}
   </article>

   <article className="panel overview-card">
    <div className="overview-card-heading"><span className="overview-icon" aria-hidden="true">✦</span><div><h2>Crestovia AI</h2><p className="muted">Your private work companion</p></div></div>
    <p className="muted">Think through decisions, draft content, get context on visible work, and create or update supported tasks with natural language.</p>
    <div className="overview-link-list"><a className="overview-link" href="/dashboard/assistant">Open AI assistant</a><a className="overview-link" href="/dashboard/memory">Private memory</a><a className="overview-link" href="/dashboard/approvals">Review action proposals</a></div>
   </article>

   <article className="panel overview-card">
    <div className="overview-card-heading"><span className="overview-icon" aria-hidden="true">▦</span><div><h2>Plan & deliver</h2><p className="muted">Keep work moving</p></div></div>
    <p className="muted">Bring project plans, task ownership, and department structure into a shared operating rhythm.</p>
    <div className="overview-link-list"><a className="overview-link" href="/dashboard/tasks">Tasks & priorities</a><a className="overview-link" href="/dashboard/projects">Projects</a><a className="overview-link" href="/dashboard/departments">Departments</a></div>
   </article>

   <article className="panel overview-card">
    <div className="overview-card-heading"><span className="overview-icon" aria-hidden="true">◌</span><div><h2>Work together</h2><p className="muted">People and conversations</p></div></div>
    <p className="muted">Give your team a place to coordinate, share updates, and connect approved communication channels.</p>
    <div className="overview-link-list"><a className="overview-link" href="/dashboard/chat">Company team chat</a>{isOwner?<a className="overview-link" href="/dashboard/team">Manage team access</a>:null}<a className="overview-link" href="/dashboard/integrations/whatsapp">WhatsApp integration</a></div>
   </article>

   <article className="panel overview-card">
    <div className="overview-card-heading"><span className="overview-icon" aria-hidden="true">◈</span><div><h2>Stay in control</h2><p className="muted">Security and visibility</p></div></div>
    <p className="muted">Keep account protection, notifications, and workspace accountability close at hand.</p>
    <div className="overview-link-list"><a className="overview-link" href="/dashboard/security">Account security</a><a className="overview-link" href="/dashboard/notifications">Notifications</a>{canViewAudit?<a className="overview-link" href="/dashboard/audit">Audit history</a>:null}</div>
   </article>

   {isOwner?<article className="panel overview-card overview-card-full">
    <div className="overview-card-heading"><span className="overview-icon" aria-hidden="true">⚙</span><div><h2>Owner control center</h2><p className="muted">Administration and launch readiness</p></div></div>
    <p className="muted">Manage company-level access and review operational readiness. Sensitive actions remain governed by account permissions and security controls.</p>
    <div className="overview-actions" style={{marginTop:18}}><a className="button button-secondary" href="/admin">Private admin panel</a><a className="button button-secondary" href="/dashboard/readiness">Launch readiness</a></div>
   </article>:null}
  </section>
  <div className="overview-divider"></div>
  <footer style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><p className="muted" style={{fontSize:12,margin:0}}>A secure workspace for people and AI to work better together.</p><SignOutButton/></footer>
 </main>;
}
