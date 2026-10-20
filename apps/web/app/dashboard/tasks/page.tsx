import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createTask,updateTaskStatus} from "../actions";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function TasksPage({searchParams}:Props){
 const p=await searchParams,supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)redirect("/login");
 const {data:ms}=await supabase.from("memberships").select("organization_id,role,organizations(name)").eq("user_id",user.id).eq("status","active").limit(1);const m=ms?.[0];if(!m)redirect("/onboarding");await enforceOwnerMfa(supabase,m.role);
 const org=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;
 const [{data:tasks,error},{data:projects},{data:people}]=await Promise.all([
  supabase.from("tasks").select("id,title,description,status,priority,due_at,project_id,projects(name)").eq("organization_id",m.organization_id).order("created_at",{ascending:false}).limit(100),
  supabase.from("projects").select("id,name").eq("organization_id",m.organization_id).order("name"),
  supabase.from("memberships").select("user_id,role").eq("organization_id",m.organization_id).eq("status","active")
 ]);
 const requested=typeof p.project==="string"?p.project:"";
 return <main className="container"><nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/projects">Projects</Link>{m.role==="owner"?<Link href="/dashboard/team">Team access</Link>:null}</nav>
 <header className="page-header"><div><p className="brand">CRESTOVIA AI / WORKSPACE</p><h1>Tasks</h1><p className="muted">{org?.name??"Your organization"} · Work visible to your account</p></div><span className="role-pill">{m.role}</span></header>
 {p.created==="1"?<p className="notice notice-success">Task created.</p>:null}{p.updated==="1"?<p className="notice notice-success">Task status updated.</p>:null}{p.error?<p className="notice notice-error">Could not complete that action: {String(p.error).replaceAll("_"," ")}</p>:null}
 <section className="panel" style={{marginBottom:18}}><h2>Create a task</h2><form action={createTask} className="form-grid">
 <div><label htmlFor="title">Task title</label><input className="input" id="title" name="title" minLength={2} maxLength={200} required placeholder="e.g. Draft requirements"/></div>
 <div><label htmlFor="description">Description</label><input className="input" id="description" name="description" maxLength={5000} placeholder="Optional details"/></div>
 <div><label htmlFor="project_id">Project</label><select className="input" id="project_id" name="project_id" defaultValue={requested}><option value="">No project</option>{projects?.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
 <div><label htmlFor="priority">Priority</label><select className="input" id="priority" name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
 <div><label htmlFor="assigned_to">Assign to</label><select className="input" id="assigned_to" name="assigned_to" defaultValue=""><option value="">Unassigned</option>{people?.map(x=><option key={x.user_id} value={x.user_id}>{x.user_id===user.id?"Me":x.user_id.slice(0,8)+"…"} ({x.role})</option>)}</select></div>
 <div><label htmlFor="due_at">Due date (optional)</label><input className="input" id="due_at" name="due_at" type="datetime-local"/></div><div className="form-actions"><button className="button" type="submit">Create task</button></div></form></section>
 {error?<section className="panel"><h2>Tasks unavailable</h2><p className="muted">Check the migration state and project assignment.</p></section>:!tasks?.length?<section className="panel empty-state"><h2>No tasks yet</h2><p className="muted">Create a task above. Database policies enforce project access.</p></section>:<section className="task-list">{tasks.map(x=>{const project=Array.isArray(x.projects)?x.projects[0]:x.projects;return <article className="panel task-row" key={x.id}><div className="task-main"><h2>{x.title}</h2><p className="muted">{x.description||"No description"}{project?.name?" · "+project.name:""}</p><p className="muted" style={{fontSize:12}}>Due: {x.due_at?new Date(x.due_at).toLocaleString():"Not scheduled"}</p></div><div className="task-meta"><span className={"status status-"+x.status}>{x.status.replaceAll("_"," ")}</span><span className={"priority priority-"+x.priority}>{x.priority}</span><form action={updateTaskStatus} className="inline-form"><input type="hidden" name="task_id" value={x.id}/><label className="visually-hidden" htmlFor={"status-"+x.id}>Update status for {x.title}</label><select className="input compact-input" id={"status-"+x.id} name="status" defaultValue={x.status}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="in_review">In review</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select><button className="button button-secondary" type="submit">Save</button></form></div></article>})}</section>}</main>;
}
