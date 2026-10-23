import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
import {getActiveOrganizationMembership} from "@/lib/organizations/active-membership";
import {markAllNotificationsRead,markNotificationRead} from "./actions";

type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
type Notification={id:string,type:string,title:string,body:string,entity_type:string|null,entity_id:string|null,read_at:string|null,created_at:string};
function dateLabel(value:string){return new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Karachi"}).format(new Date(value))}
export default async function NotificationsPage({searchParams}:Props){
 const params=await searchParams,supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {membership}=await getActiveOrganizationMembership(supabase,user);if(!membership)redirect("/onboarding");await enforceOwnerMfa(supabase,membership.role);
 const organization=Array.isArray(membership.organizations)?membership.organizations[0]:membership.organizations;
 const {data, error:loadError}=await supabase.from("notifications").select("id,type,title,body,entity_type,entity_id,read_at,created_at").eq("organization_id",membership.organization_id).eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(100);
 const notifications=(data??[]) as Notification[],unread=notifications.filter(item=>!item.read_at).length;
 return <main className="container"><nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/tasks">Tasks</Link><Link href="/dashboard/briefing">Daily briefing</Link></nav>
 <header className="page-header"><div><p className="brand">CRESTOVIA AI / WORKSPACE</p><h1>Notifications</h1><p className="muted">{organization?.name??"Your organization"} · {unread} unread</p></div>{unread>0?<form action={markAllNotificationsRead}><button className="button button-secondary" type="submit">Mark all read</button></form>:null}</header>
 {params.read==="1"?<p className="notice notice-success">Notification marked as read.</p>:null}{params.read_all==="1"?<p className="notice notice-success">All notifications marked as read.</p>:null}{params.error?<p className="notice notice-error">Could not complete that action: {String(params.error).replaceAll("_"," ")}</p>:null}
 {loadError?<section className="panel"><h2>Notifications unavailable</h2><p className="muted">Check that database migration 0024 has been applied.</p></section>:!notifications.length?<section className="panel empty-state"><h2>You’re all caught up</h2><p className="muted">Task assignments and deadline reminders will appear here.</p></section>:<section className="task-list">{notifications.map(item=><article className="panel notification-row" key={item.id}><div className="notification-content"><div className="card-topline"><h2>{item.title}</h2>{!item.read_at?<span className="status status-in_progress">Unread</span>:<span className="status">Read</span>}</div><p>{item.body}</p><p className="muted small">{item.type.replaceAll("_"," ")} · {dateLabel(item.created_at)}</p>{item.entity_type==="task"?<Link href="/dashboard/tasks">Open tasks</Link>:null}</div>{!item.read_at?<form action={markNotificationRead}><input type="hidden" name="notification_id" value={item.id}/><button className="button button-secondary" type="submit">Mark read</button></form>:null}</article>)}</section>}
 </main>;
}
