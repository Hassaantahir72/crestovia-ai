import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
import {getActiveOrganizationMembership} from "@/lib/organizations/active-membership";
import {createTeamChannel,sendTeamMessage} from "./actions";

type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
const canManage=(role:string)=>["owner","admin","manager"].includes(role);

export default async function TeamChatPage({searchParams}:Props){
 const p=await searchParams,supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect("/login");
 const {membership}=await getActiveOrganizationMembership(supabase,user);
 if(!membership)redirect("/onboarding");
 await enforceOwnerMfa(supabase,membership.role);
 const organization=Array.isArray(membership.organizations)?membership.organizations[0]:membership.organizations;
 const {data:channels,error:channelError}=await supabase.from("team_channels")
  .select("id,name,slug,description,visibility,channel_type,created_at")
  .eq("organization_id",membership.organization_id).order("name").limit(100);
 const requested=typeof p.channel==="string"?p.channel:"";
 const activeChannel=(channels??[]).find(c=>c.id===requested)??(channels??[])[0]??null;
 let messages:any[]=[];
 let messageError=false;
 if(activeChannel){
  const result=await supabase.from("team_messages")
   .select("id,channel_id,author_id,body,created_at")
   .eq("organization_id",membership.organization_id).eq("channel_id",activeChannel.id)
   .order("created_at",{ascending:false}).limit(100);
  messages=(result.data??[]).reverse();
  messageError=Boolean(result.error);
 }
 const errorKey=typeof p.error==="string"?p.error:"";
 const errors:Record<string,string>={
  channel_permission:"Only owners, admins, and managers can create channels.",
  channel_invalid:"Check the channel name and try again.",
  channel_create_failed:"The channel could not be created. Its name may already be in use.",
  channel_unavailable:"That channel is unavailable to your account.",
  message_invalid:"Messages must contain 1–8,000 characters.",
  message_send_failed:"The message could not be sent. Check your channel access and try again."
 };
 return <main className="container">
  <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/assistant">AI assistant</Link><Link href="/dashboard/tasks">Tasks</Link><Link href="/dashboard/projects">Projects</Link></nav>
  <header className="page-header"><div><p className="brand">CRESTOVIA AI / TEAM</p><h1>Team chat</h1><p className="muted">{organization?.name??"Your organization"} · Company conversations, separate from your private AI chat</p></div><span className="role-pill">{membership.role}</span></header>
  {p.created==="1"?<p className="notice notice-success">Channel created.</p>:null}
  {p.sent==="1"?<p className="notice notice-success">Message sent.</p>:null}
  {errorKey&&errors[errorKey]?<p className="notice notice-error">{errors[errorKey]}</p>:null}
  <section className="team-chat-layout">
   <aside className="panel team-chat-sidebar"><div className="card-topline"><h2>Channels</h2><span className="status">{(channels??[]).length}</span></div>
    {channelError?<p className="muted">Channels could not be loaded. Check that migration 0037 has been applied to the current database.</p>:!(channels??[]).length?<div className="chat-empty"><h3>No channels yet</h3><p className="muted">An owner, admin, or manager can create the first team channel below.</p></div>:<div className="conversation-links">{channels!.map(c=><Link className={"conversation-link"+(activeChannel?.id===c.id?" active":"")} key={c.id} href={"/dashboard/chat?channel="+c.id}><strong># {c.name}</strong><br/><span className="muted">{c.description||"Company-wide discussion"}</span></Link>)}</div>}
    {canManage(membership.role)?<form action={createTeamChannel} className="team-channel-form"><h3>Create a channel</h3><label htmlFor="channel-name">Channel name</label><input className="input" id="channel-name" name="name" minLength={2} maxLength={80} required placeholder="e.g. Announcements"/><label htmlFor="channel-description">Purpose (optional)</label><textarea className="input" id="channel-description" name="description" maxLength={500} rows={3} placeholder="What should the team use this channel for?"/><button className="button" type="submit">Create channel</button></form>:null}
   </aside>
   <section className="panel team-chat-main">
    {activeChannel?<><div className="chat-heading"><div><h2># {activeChannel.name}</h2><p className="muted">{activeChannel.description||"Company-wide channel"} · {activeChannel.visibility} · Messages are visible to authorized channel members.</p></div></div>
     {messageError?<p className="notice notice-error">Messages could not be loaded. Check the database migration and channel permissions.</p>:null}
     <div className="chat-messages team-message-list">{messages.length?messages.map((m:any)=><article className={"chat-message "+(m.author_id===user.id?"user-message":"assistant-message")} key={m.id}><p className="message-role">{m.author_id===user.id?"You":"Team member · "+m.author_id.slice(0,8)} · {new Date(m.created_at).toLocaleString()}</p><p className="message-content">{m.body}</p></article>):<div className="chat-empty"><h3>Start the conversation</h3><p className="muted">Share an update, ask a teammate a question, or coordinate the next step.</p></div>}</div>
     <form action={sendTeamMessage} className="chat-composer"><input type="hidden" name="channel_id" value={activeChannel.id}/><label htmlFor="team-message">Message your team</label><textarea className="input chat-input" id="team-message" name="body" required minLength={1} maxLength={8000} rows={4} placeholder="Write a message…"/><div className="chat-compose-footer"><span className="muted">Company chat · Not sent to the AI assistant</span><button className="button" type="submit">Send message</button></div></form>
    </>:<div className="chat-empty"><h2>Company team chat</h2><p className="muted">Create a channel to begin sharing updates with your team. This is separate from the private AI assistant.</p></div>}
   </section>
  </section>
 </main>;
}
