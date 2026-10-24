import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
import {getActiveOrganizationMembership} from "@/lib/organizations/active-membership";
import {createConversation,deleteConversation,proposeAssistantActionForApproval,testAssistantProvider} from "./actions";
import AssistantComposer from "./assistant-composer";
import AssistantAvatar from "./assistant-avatar";
import SpeakReplyButton from "./speak-reply-button";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
const errorText:Record<string,string>={
 ai_provider_not_configured:"AI replies are prepared but not active yet. GROQ_API_KEY must be configured as a server-only secret before the assistant can answer.",
 ai_provider_invalid_configuration:"The AI model configuration is invalid. Check GROQ_MODEL privately; do not put secrets in this setting.",
 ai_provider_timeout:"Groq took too long to respond. Your message was saved; wait a moment and try again.",
 ai_provider_invalid_response:"Groq returned an unreadable response. Your message was saved; you can retry.",
 ai_provider_auth_failed:"The AI provider rejected the configured credentials. Check the server secret privately.",
 ai_provider_rate_limited:"The AI provider is rate-limiting requests. Wait and try again.",
 ai_provider_request_failed:"Your message was saved, but the AI provider could not reply. You can retry without losing the submitted prompt.",
 ai_provider_empty_response:"The AI provider returned an empty response.",
 assistant_rate_limited:"You have sent too many assistant messages. Wait a moment before trying again.",
 rate_limit_unavailable:"The request protection service is unavailable. Your message was not sent; please try again shortly.",
 conversation_create_failed:"Could not create a conversation.",conversation_not_found:"That conversation is unavailable or belongs to another account.",empty_message:"Write a message before sending.",history_failed:"Could not load the conversation history.",message_save_failed:"The message could not be saved.",reply_save_failed:"The AI reply could not be saved.",conversation_delete_failed:"Could not delete that conversation.",
  invalid_approval_proposal:"That assistant response cannot be submitted for approval.",
  approval_proposal_unavailable:"That assistant response is unavailable to this account.",
  approval_proposal_failed:"Could not submit this proposal. Please try again.",
  approval_rate_limited:"You have created too many approval requests. Wait before submitting another.",
  approval_rate_limit_unavailable:"Request protection is unavailable, so no approval request was created. Please try again shortly.",
  provider_test_owner_only:"Only the organization owner can run the provider connection test.",
 provider_test_not_configured:"GROQ_API_KEY is not configured as a server-only secret.",
 provider_test_auth_failed:"Groq rejected the configured credentials. Check the key privately; it is never displayed here.",
 provider_test_rate_limited:"Groq rate-limited the connection test. Wait before trying again.",
 provider_test_request_failed:"The connection test could not complete. Check the selected model and provider status.",
 provider_test_empty_response:"Groq accepted the request but returned no assistant text.",
 provider_test_timeout:"The connection test timed out after 10 seconds. Try again later.",
 provider_test_app_rate_limited:"Too many provider connection tests. Wait before trying again.",
 provider_test_rate_limit_unavailable:"The request protection service is unavailable, so the provider test was not run. Try again shortly.",
};
export default async function AssistantPage({searchParams}:Props){
 const p=await searchParams,supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {membership}=await getActiveOrganizationMembership(supabase,user);if(!membership)redirect("/onboarding");await enforceOwnerMfa(supabase,membership.role);
 const {data:conversations}=await supabase.from("assistant_conversations").select("id,title,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30);
 const requested=typeof p.conversation==="string"?p.conversation:"",activeId=requested||(conversations?.[0]?.id??"");
 const active=conversations?.find(x=>x.id===activeId)??null;
 const {data:messages}=active?await supabase.from("assistant_messages").select("id,role,content,created_at").eq("conversation_id",active.id).eq("user_id",user.id).order("created_at",{ascending:true}).limit(100):{data:[]};
 const aiKeyDetected=Boolean(process.env.GROQ_API_KEY),isOwner=membership.role==="owner";
 const latestAssistantMessageId=[...(messages??[])].reverse().find(message=>message.role==="assistant")?.id;
 const providerTest=typeof p.provider_test==="string"?p.provider_test:"";
 const errorKey=typeof p.error==="string"?p.error:"";
 return <main className="container"><nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/projects">Projects</Link><Link href="/dashboard/memory">Private memory</Link><Link href="/dashboard/security">Account security</Link></nav>
 <header className="page-header assistant-page-header"><div className="assistant-title-row"><AssistantAvatar size={84}/><div><p className="brand">CRESTOVAI AI / ASSISTANT</p><h1>Crestovai AI assistant</h1><p className="muted">Private to your signed-in account. When enabled, recent chat and selected saved memories are sent to Groq. I can answer questions about visible tasks and projects, create clearly requested tasks, and update a task status when its exact title is unique. Other company changes still require supported workflows and permissions.</p></div></div><form action={createConversation}><button className="button" type="submit">New conversation</button></form></header>
 {!aiKeyDetected?<p className="notice notice-error">AI provider is not configured on this server yet. Add GROQ_API_KEY as a private server-side secret, then restart or redeploy the web service. Never use a NEXT_PUBLIC_ variable or commit the key.</p>:<p className="notice">AI provider key detected; connectivity and validity have not been tested yet. The key itself is never displayed.</p>}
 {providerTest==="success"?<p className="notice notice-success">Groq connection test passed. The server received a non-empty response; the API key was not exposed.</p>:null}
 {providerTest&&providerTest!=="success"&&errorText["provider_test_"+providerTest]?<p className="notice notice-error">{errorText["provider_test_"+providerTest]}</p>:null}
 {isOwner?<section className="panel" style={{marginBottom:18}}><div className="card-topline"><div><h2>AI provider diagnostics</h2><p className="muted">Sends one short test prompt from the server. It does not save a conversation or change company data.</p></div><form action={testAssistantProvider}><button className="button" type="submit">Test AI connection</button></form></div></section>:null}
 {errorKey&&errorText[errorKey]?<p className="notice notice-error">{errorText[errorKey]}</p>:null}{p.deleted==="1"?<p className="notice notice-success">Conversation deleted.</p>:null}{p.approval_created==="1"?<p className="notice notice-success">Assistant proposal submitted for owner review. No action has been executed.</p>:null}
 <div className="assistant-layout"><aside className="panel assistant-sidebar"><h2>Recent conversations</h2>{!conversations?.length?<p className="muted">No conversations yet.</p>:<div className="conversation-links">{conversations.map(c=><Link className={c.id===activeId?"conversation-link active":"conversation-link"} key={c.id} href={"/dashboard/assistant?conversation="+c.id}>{c.title}</Link>)}</div>}</aside>
 <section className="panel assistant-chat">{active?<><div className="chat-heading"><div><h2>{active.title}</h2><p className="muted">Conversation history is private to this account.</p></div><form action={deleteConversation}><input type="hidden" name="conversation_id" value={active.id}/><button className="button button-danger" type="submit">Delete</button></form></div>
 <div className="chat-messages">{!messages?.length?<div className="chat-empty"><h3>What would you like to work on?</h3><p className="muted">Ask for planning, writing, analysis, task creation, task status updates, or a daily workspace briefing.</p></div>:messages.map(m=><article className={m.role==="user"?"chat-message user-message":"chat-message assistant-message"} key={m.id}><p className="message-role">{m.role==="user"?"You":"Crestovai AI"}</p><p className="message-content">{m.content}</p>{m.role==="assistant"?<><SpeakReplyButton text={m.content} autoPlay={p.voice_reply==="1"&&m.id===latestAssistantMessageId}/><form action={proposeAssistantActionForApproval} className="approval-review"><input type="hidden" name="message_id" value={m.id}/><label htmlFor={"proposal-type-"+m.id}>Turn this response into an approval request</label><select className="input" id={"proposal-type-"+m.id} name="action_type" defaultValue="other"><option value="create_task">Create workspace task</option><option value="external_write">External change</option><option value="send_email">Send email</option><option value="send_message">Send message</option><option value="calendar_change">Calendar change</option><option value="data_export">Data export</option><option value="other">Other</option></select><p className="muted" style={{fontSize:12}}>This submits the response text to the owner for review. It does not execute the proposed action.</p><button className="button" type="submit">Submit for approval</button></form></>:null}</article>)}</div>
 <AssistantComposer conversationId={active.id} />
 </>:<div className="chat-empty"><h2>Start your first conversation</h2><p className="muted">Create a private conversation. AI replies activate when the provider secret is configured.</p><form action={createConversation}><button className="button" type="submit">Create conversation</button></form></div>}</section></div></main>;
}
