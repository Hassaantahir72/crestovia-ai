import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {SignOutButton} from "./sign-out-button";
export default async function DashboardPage(){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("role,status,organizations(id,name,slug)").eq("user_id",user.id).eq("status","active");if(!memberships?.length)redirect("/onboarding");
 const isOwner=memberships.some(m=>m.role==="owner");
 return <main className="container"><header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:28}}><div><p className="brand">CRESTOVIA AI</p><h1 style={{marginBottom:4}}>Workspace overview</h1><p className="muted">Your personal and company operating workspace</p></div><SignOutButton/></header>
 <section className="grid"><article className="panel"><h2>Identity</h2><p className="muted">Signed in as</p><strong>{user.email}</strong><p className="muted" style={{fontSize:12,overflowWrap:"anywhere"}}>User ID: {user.id}</p><p><span className="role-pill">{isOwner?"Owner account":"Team member"}</span></p></article>
 <article className="panel"><h2>Organizations</h2>{memberships.map((m,i)=>{const org=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;return <p key={(org?.id??"org")+"-"+i}><strong>{org?.name??"Organization"}</strong><br/><span className="muted">{m.role}</span></p>})}</article>
 <article className="panel"><h2>AI assistant</h2><p className="muted">AI chat, permission-filtered memory, and approval-gated actions are planned next.</p></article>
 <article className="panel"><h2>Company workspace</h2><p className="muted">Team members only see work allowed by project assignments.</p><div className="action-links"><a className="button" href="/dashboard/projects">Open projects</a><a className="button button-secondary" href="/dashboard/tasks">Open tasks</a>{isOwner?<a className="button button-secondary" href="/dashboard/team">Manage team access</a>:null}</div></article>
 <article className="panel"><h2>Owner control</h2><p className="muted">{isOwner?"You control project assignments and the workspace. Invitations and enforced MFA are still in progress.":"Your access is scoped by organization membership and project assignments. Owner-private records are not part of the shared workspace."}</p></article></section></main>;
}
