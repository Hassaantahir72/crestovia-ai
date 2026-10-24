import "./team-chat.css";
import TeamChatRefresh from "./refresh";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";
import { createChannel, sendTeamMessage, startDirectConversation } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type TeamConversation = { id: string; kind: "channel" | "direct"; name: string | null; created_by: string; updated_at: string };
type TeamMessage = { id: string; author_id: string; body: string; created_at: string };

const errors: Record<string, string> = {
  channel_permission: "Only owners, admins, and managers can create channels.",
  invalid_channel: "Channel names must contain at least two characters.",
  channel_create_failed: "Could not create the channel. Confirm migration 0037 has been applied.",
  invalid_teammate: "Choose an active teammate in your organization.",
  direct_create_failed: "Could not start the direct conversation. Confirm migration 0037 has been applied.",
  empty_message: "Write a message before sending.",
  conversation_unavailable: "That conversation is not available to your account.",
  message_send_failed: "Message was not sent. Check the team chat migration and your organization membership.",
};

export default async function TeamChatPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase, membership.role);

  const [{ data: conversations, error: conversationError }, { data: colleagues }, { data: profile }] = await Promise.all([
    supabase.from("team_conversations").select("id,kind,name,created_by,updated_at").eq("organization_id", membership.organization_id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("memberships").select("user_id,role").eq("organization_id", membership.organization_id).eq("status", "active").order("created_at", { ascending: true }),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const items = (conversations ?? []) as TeamConversation[];
  const requested = typeof params.conversation === "string" ? params.conversation : "";
  const active = items.find((item) => item.id === requested) ?? items[0] ?? null;
  const { data: messages, error: messageError } = active
    ? await supabase.from("team_messages").select("id,author_id,body,created_at").eq("organization_id", membership.organization_id).eq("conversation_id", active.id).order("created_at", { ascending: true }).limit(150)
    : { data: [], error: null };
  const colleagueRows = (colleagues ?? []).filter((person) => person.user_id !== user.id);
  const displayName = profile?.display_name?.trim() || user.email || "You";
  const authorLabel = (id: string) => id === user.id ? "You" : colleagueRows.some((person) => person.user_id === id) ? "Teammate · " + id.slice(0, 8) : "Former member";
  const errorKey = typeof params.error === "string" ? params.error : "";
  const isManager = ["owner", "admin", "manager"].includes(membership.role);

  return <main className="container">
    <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/assistant">AI assistant</Link><Link href="/dashboard/projects">Projects</Link><Link href="/dashboard/integrations/whatsapp">WhatsApp integration</Link></nav>
    <header className="page-header"><div><p className="brand">CRESTOVIA AI / TEAM</p><h1>Team chat</h1><p className="muted">Internal conversations for {displayName} · messages stay inside your organization.</p></div><span className="role-pill">{membership.role}</span></header>
    {errorKey && errors[errorKey] ? <p className="notice notice-error">{errors[errorKey]}</p> : null}
    {conversationError ? <p className="notice notice-error">Team chat tables are not available yet. Apply database migration 0037 in staging first.</p> : null}
    <div className="team-chat-layout">
      <aside className="panel team-chat-sidebar">
        <h2>Channels & direct messages</h2>
        <div className="team-chat-links">
          {items.map((item) => <Link key={item.id} className={"team-chat-link" + (active?.id === item.id ? " active" : "")} href={"/dashboard/team-chat?conversation=" + item.id}>
            <span className="team-chat-link-icon">{item.kind === "channel" ? "#" : "↗"}</span><span>{item.kind === "channel" ? item.name : "Direct message · " + (item.created_by === user.id ? "started by you" : "teammate")}</span>
          </Link>)}
          {!items.length ? <p className="muted">No conversations yet. Create a channel or start a direct message.</p> : null}
        </div>
        {isManager ? <section className="team-chat-create"><h3>Create a channel</h3><form action={createChannel}><label htmlFor="channel-name">Channel name</label><input className="input" id="channel-name" name="name" required minLength={2} maxLength={80} placeholder="general, engineering, sales"/><button className="button" type="submit">Create channel</button></form></section> : null}
        <section className="team-chat-create"><h3>Message a teammate</h3><form action={startDirectConversation}><label htmlFor="team-user">Choose teammate</label><select className="input" id="team-user" name="user_id" required defaultValue=""><option value="" disabled>Select active teammate</option>{colleagueRows.map((person) => <option key={person.user_id} value={person.user_id}>{person.role} · {person.user_id.slice(0, 8)}</option>)}</select><button className="button button-secondary" type="submit" disabled={!colleagueRows.length}>Open direct message</button></form></section>
      </aside>
      <section className="panel team-chat-main">
        {active ? <><div className="team-chat-heading"><div><p className="eyebrow">{active.kind === "channel" ? "CHANNEL" : "PRIVATE DIRECT MESSAGE"}</p><h2>{active.kind === "channel" ? "#" + active.name : "Direct conversation"}</h2><p className="muted">Organization-scoped · no AI messages mixed into this conversation</p></div><div style={{display:"grid",gap:8,justifyItems:"end"}}><span className="status">{messages?.length ?? 0} messages loaded</span><TeamChatRefresh /></div></div>
          {messageError ? <p className="notice notice-error">Messages could not be loaded. Check database policies.</p> : null}
          <div className="team-chat-messages">{(messages as TeamMessage[] | null ?? []).map((message) => <article key={message.id} className={"team-chat-message" + (message.author_id === user.id ? " mine" : "")}><div className="team-chat-byline"><strong>{authorLabel(message.author_id)}</strong><time dateTime={message.created_at}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(message.created_at))}</time></div><p>{message.body}</p></article>)}
            {!messages?.length ? <div className="chat-empty"><h3>Start the conversation</h3><p className="muted">Messages are shared with this channel or its direct-message participants.</p></div> : null}</div>
          <form action={sendTeamMessage} className="team-chat-composer"><input type="hidden" name="conversation_id" value={active.id}/><label htmlFor="team-message">Message your team</label><textarea className="input" id="team-message" name="body" rows={3} required maxLength={12000} placeholder="Share an update or ask your teammate…"/><div className="team-chat-send-row"><span className="muted">Avoid sharing passwords or API keys in chat.</span><button className="button" type="submit">Send message</button></div></form>
        </> : <div className="chat-empty"><h2>Your team space</h2><p className="muted">Create a channel or open a direct message to start collaborating. AI assistant conversations remain separate.</p></div>}
      </section>
    </div>
  </main>;
}
