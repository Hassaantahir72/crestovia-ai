import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createProject} from "../actions";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function ProjectsPage({searchParams}:Props){
 const p=await searchParams,supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)redirect("/login");
 const {data:ms}=await supabase.from("memberships").select("organization_id,role,organizations(name)").eq("user_id",user.id).eq("status","active").limit(1);const m=ms?.[0];if(!m)redirect("/onboarding");await enforceOwnerMfa(supabase,m.role);
 const org=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;
 const {data:projects,error}=await supabase.from("projects").select("id,name,description,status,priority,due_date").eq("organization_id",m.organization_id).order("updated_at",{ascending:false});
 return <main className="container"><nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/tasks">Tasks</Link>{m.role==="owner"?<Link href="/dashboard/team">Team access</Link>:null}</nav>
 <header className="page-header"><div><p className="brand">CRESTOVIA AI / WORKSPACE</p><h1>Projects</h1><p className="muted">{org?.name??"Your organization"} · Projects assigned to your account</p></div><span className="role-pill">{m.role}</span></header>
 {p.created==="1"?<p className="notice notice-success">Project created.</p>:null}{p.error?<p className="notice notice-error">Could not complete that action: {String(p.error).replaceAll("_"," ")}</p>:null}
 {m.role==="owner"?<section className="panel" style={{marginBottom:18}}><h2>Create a project</h2><form action={createProject} className="form-grid">
 <div><label htmlFor="name">Project name</label><input className="input" id="name" name="name" minLength={2} maxLength={160} required placeholder="e.g. Client portal"/></div>
 <div><label htmlFor="description">Description</label><input className="input" id="description" name="description" maxLength={5000} placeholder="Expected outcome"/></div>
 <div><label htmlFor="status">Status</label><select className="input" id="status" name="status" defaultValue="planned"><option value="planned">Planned</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="completed">Completed</option></select></div>
 <div><label htmlFor="priority">Priority</label><select className="input" id="priority" name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
 <div><label htmlFor="due_date">Due date (optional)</label><input className="input" id="due_date" name="due_date" type="date"/></div><div className="form-actions"><button className="button" type="submit">Create project</button></div></form></section>:null}
 {error?<section className="panel"><h2>Projects unavailable</h2><p className="muted">Check the migration state and project assignment.</p></section>:!projects?.length?<section className="panel empty-state"><h2>No assigned projects yet</h2><p className="muted">Create a project as owner, then grant teammates access from Team access.</p></section>:<section className="grid">{projects.map(x=><article className="panel" key={x.id}><div className="card-topline"><span className={"status status-"+x.status}>{x.status.replaceAll("_"," ")}</span><span className={"priority priority-"+x.priority}>{x.priority}</span></div><h2>{x.name}</h2><p className="muted">{x.description||"No description added."}</p><p className="muted">Due: {x.due_date??"Not scheduled"}</p><Link className="button button-secondary" href={"/dashboard/tasks?project="+x.id}>View project tasks</Link></article>)}</section>}</main>;
}
