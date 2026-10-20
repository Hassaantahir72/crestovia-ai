"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
import {generateAssistantReply,type AssistantMessage} from "@/lib/ai/provider";
import {runReadOnlyAssistantTools} from "@/lib/ai/workspace-tools";
async function getUserContext(){
 const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("organization_id,role").eq("user_id",user.id).eq("status","active").order("created_at",{ascending:true}).limit(1);if(!memberships?.length)redirect("/onboarding");
 await enforceOwnerMfa(supabase,memberships[0].role);return {supabase,user,membership:memberships[0]};
}
function field(data:FormData,name:string,max:number){return String(data.get(name)??"").trim().slice(0,max)}
export async function testAssistantProvider(){
 const {membership}=await getUserContext();
 if(membership.role!=="owner")redirect("/dashboard/assistant?provider_test=owner_only");
 const apiKey=process.env.GROQ_API_KEY;
 if(!apiKey)redirect("/dashboard/assistant?provider_test=not_configured");
 const model=process.env.GROQ_MODEL||"llama-3.3-70b-versatile";
 try{
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
   method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({model,messages:[{role:"user",content:"Reply with OK only."}],temperature:0,max_tokens:8}),
   cache:"no-store",signal:AbortSignal.timeout(10000)
  });
  if(!response.ok){
   if(response.status===401||response.status===403)redirect("/dashboard/assistant?provider_test=auth_failed");
   if(response.status===429)redirect("/dashboard/assistant?provider_test=rate_limited");
   redirect("/dashboard/assistant?provider_test=request_failed");
  }
  const result=await response.json() as {choices?:{message?:{content?:string|null}}[]};
  if(!result.choices?.[0]?.message?.content?.trim())redirect("/dashboard/assistant?provider_test=empty_response");
  redirect("/dashboard/assistant?provider_test=success");
 }catch(error){
  if(error instanceof Error&&error.message==="NEXT_REDIRECT")throw error;
  if(error instanceof Error&&(error.name==="TimeoutError"||error.name==="AbortError"))redirect("/dashboard/assistant?provider_test=timeout");
  redirect("/dashboard/assistant?provider_test=request_failed");
 }
}
export async function createConversation(){
 const {supabase,user}=await getUserContext();const {data,error}=await supabase.from("assistant_conversations").insert({user_id:user.id,title:"New conversation"}).select("id").single();
 if(error||!data)redirect("/dashboard/assistant?error=conversation_create_failed");redirect("/dashboard/assistant?conversation="+data.id);
}
export async function sendAssistantMessage(data:FormData){
 const {supabase,user,membership}=await getUserContext();const id=field(data,"conversation_id",64),content=field(data,"content",12000);
 if(!id||!content)redirect("/dashboard/assistant?error=empty_message");
 const {data:conversation}=await supabase.from("assistant_conversations").select("id,title").eq("id",id).eq("user_id",user.id).maybeSingle();if(!conversation)redirect("/dashboard/assistant?error=conversation_not_found");
 const {data:prior,error:historyError}=await supabase.from("assistant_messages").select("role,content").eq("conversation_id",id).eq("user_id",user.id).order("created_at",{ascending:true}).limit(20);
 if(historyError)redirect("/dashboard/assistant?conversation="+id+"&error=history_failed");
 const {data:savedMemories}=await supabase.from("assistant_memories").select("category,title,content").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(8);
 let answer="";
 try{const workspaceContext=await runReadOnlyAssistantTools(supabase,membership.organization_id,user.id,content);answer=await generateAssistantReply([...(prior??[]) as AssistantMessage[],{role:"user",content}],savedMemories??[],workspaceContext)}
 catch(e){const code=e instanceof Error?e.message:"AI_PROVIDER_REQUEST_FAILED";const allowed=["AI_PROVIDER_NOT_CONFIGURED","AI_PROVIDER_AUTH_FAILED","AI_PROVIDER_RATE_LIMITED","AI_PROVIDER_REQUEST_FAILED","AI_PROVIDER_EMPTY_RESPONSE"];redirect("/dashboard/assistant?conversation="+id+"&error="+(allowed.includes(code)?code.toLowerCase():"ai_provider_request_failed"))}
 const {error:userErr}=await supabase.from("assistant_messages").insert({conversation_id:id,user_id:user.id,role:"user",content});if(userErr)redirect("/dashboard/assistant?conversation="+id+"&error=message_save_failed");
 const {error:assistantErr}=await supabase.from("assistant_messages").insert({conversation_id:id,user_id:user.id,role:"assistant",content:answer});if(assistantErr)redirect("/dashboard/assistant?conversation="+id+"&error=reply_save_failed");
 const title=conversation.title==="New conversation"?content.slice(0,60):conversation.title;
 await supabase.from("assistant_conversations").update({title,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
 revalidatePath("/dashboard/assistant");redirect("/dashboard/assistant?conversation="+id);
}
export async function deleteConversation(data:FormData){
 const {supabase,user}=await getUserContext();const id=field(data,"conversation_id",64);if(!id)redirect("/dashboard/assistant?error=conversation_not_found");
 const {error}=await supabase.from("assistant_conversations").delete().eq("id",id).eq("user_id",user.id);if(error)redirect("/dashboard/assistant?conversation="+id+"&error=conversation_delete_failed");
 revalidatePath("/dashboard/assistant");redirect("/dashboard/assistant?deleted=1");
}
export async function createMemory(data:FormData){
 const {supabase,user}=await getUserContext();const title=field(data,"title",160),category=field(data,"category",80)||"general",content=field(data,"content",12000);
 if(!title||!content)redirect("/dashboard/memory?error=invalid_memory");
 const {error}=await supabase.from("assistant_memories").insert({user_id:user.id,title,category,content});if(error)redirect("/dashboard/memory?error=memory_save_failed");
 revalidatePath("/dashboard/memory");redirect("/dashboard/memory?saved=1");
}
export async function updateMemory(data:FormData){
 const {supabase,user}=await getUserContext();const id=field(data,"memory_id",64),title=field(data,"title",160),category=field(data,"category",80),content=field(data,"content",12000);
 const allowedCategories=["general","work","preference","project","process"];
 if(!id||!title||!content||!allowedCategories.includes(category))redirect("/dashboard/memory?error=invalid_memory");
 const {data:existing,error:lookupError}=await supabase.from("assistant_memories").select("id").eq("id",id).eq("user_id",user.id).maybeSingle();
 if(lookupError||!existing)redirect("/dashboard/memory?error=memory_not_found");
 const {error}=await supabase.from("assistant_memories").update({title,category,content,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id);
 if(error)redirect("/dashboard/memory?error=memory_update_failed");
 revalidatePath("/dashboard/memory");revalidatePath("/dashboard/assistant");redirect("/dashboard/memory?updated=1");
}
export async function deleteMemory(data:FormData){
 const {supabase,user}=await getUserContext();const id=field(data,"memory_id",64);if(!id)redirect("/dashboard/memory?error=memory_not_found");
 const {error}=await supabase.from("assistant_memories").delete().eq("id",id).eq("user_id",user.id);if(error)redirect("/dashboard/memory?error=memory_delete_failed");
 revalidatePath("/dashboard/memory");redirect("/dashboard/memory?deleted=1");
}


export async function proposeAssistantActionForApproval(data:FormData){
 const {supabase,user,membership}=await getUserContext();
 const messageId=field(data,"message_id",64),actionType=field(data,"action_type",32)||"other";
 if(!messageId||!["create_task","external_write","send_email","send_message","calendar_change","data_export","other"].includes(actionType))redirect("/dashboard/assistant?error=invalid_approval_proposal");
 const {data:message,error:messageError}=await supabase.from("assistant_messages").select("id,conversation_id,content,role").eq("id",messageId).eq("user_id",user.id).eq("role","assistant").maybeSingle();
 if(messageError||!message)redirect("/dashboard/assistant?error=approval_proposal_unavailable");
 const {data:conversation,error:conversationError}=await supabase.from("assistant_conversations").select("id").eq("id",message.conversation_id).eq("user_id",user.id).maybeSingle();
 if(conversationError||!conversation)redirect("/dashboard/assistant?error=approval_proposal_unavailable");
 const details=String(message.content??"").trim().slice(0,4000);
 const summary=details.replace(/\s+/g," ").slice(0,200);
 if(summary.length<3)redirect("/dashboard/assistant?error=invalid_approval_proposal");
 const {data:created,error}=await supabase.from("action_approval_requests").insert({organization_id:membership.organization_id,requested_by:user.id,action_type:actionType,summary,details}).select("id").single();
 if(error||!created)redirect("/dashboard/assistant?conversation="+message.conversation_id+"&error=approval_proposal_failed");
 await (await import("@/lib/security/audit")).recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"approval.request.created_from_assistant",entityType:"action_approval_request",entityId:created.id,metadata:{action_type:actionType,assistant_message_id:message.id}});
 revalidatePath("/dashboard/approvals");revalidatePath("/dashboard/assistant");
 redirect("/dashboard/assistant?conversation="+message.conversation_id+"&approval_created=1");
}
