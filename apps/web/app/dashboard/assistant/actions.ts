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
export async function createConversation(){
 const {supabase,user}=await getUserContext();const {data,error}=await supabase.from("assistant_conversations").insert({user_id:user.id,title:"New conversation"}).select("id").single();
 if(error||!data)redirect("/dashboard/assistant?error=conversation_create_failed");redirect("/dashboard/assistant?conversation="+data.id);
}
export async function sendAssistantMessage(data:FormData){
 const {supabase,user,membership}=await getUserContext();const id=field(data,"conversation_id",64),content=field(data,"content",12000);
 if(!id||!content)redirect("/dashboard/assistant?error=empty_message");
 const {data:conversation}=await supabase.from("assistant_conversations").select("id,title").eq("id",id).maybeSingle();if(!conversation)redirect("/dashboard/assistant?error=conversation_not_found");
 const {data:prior,error:historyError}=await supabase.from("assistant_messages").select("role,content").eq("conversation_id",id).order("created_at",{ascending:true}).limit(20);
 if(historyError)redirect("/dashboard/assistant?conversation="+id+"&error=history_failed");
 const {data:savedMemories}=await supabase.from("assistant_memories").select("category,title,content").order("updated_at",{ascending:false}).limit(8);
 let answer="";
 try{const workspaceContext=await runReadOnlyAssistantTools(supabase,membership.organization_id,user.id,content);answer=await generateAssistantReply([...(prior??[]) as AssistantMessage[],{role:"user",content}],savedMemories??[],workspaceContext)}
 catch(e){const code=e instanceof Error?e.message:"AI_PROVIDER_REQUEST_FAILED";const allowed=["AI_PROVIDER_NOT_CONFIGURED","AI_PROVIDER_AUTH_FAILED","AI_PROVIDER_RATE_LIMITED","AI_PROVIDER_REQUEST_FAILED","AI_PROVIDER_EMPTY_RESPONSE"];redirect("/dashboard/assistant?conversation="+id+"&error="+(allowed.includes(code)?code.toLowerCase():"ai_provider_request_failed"))}
 const {error:userErr}=await supabase.from("assistant_messages").insert({conversation_id:id,user_id:user.id,role:"user",content});if(userErr)redirect("/dashboard/assistant?conversation="+id+"&error=message_save_failed");
 const {error:assistantErr}=await supabase.from("assistant_messages").insert({conversation_id:id,user_id:user.id,role:"assistant",content:answer});if(assistantErr)redirect("/dashboard/assistant?conversation="+id+"&error=reply_save_failed");
 const title=conversation.title==="New conversation"?content.slice(0,60):conversation.title;
 await supabase.from("assistant_conversations").update({title,updated_at:new Date().toISOString()}).eq("id",id);
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
export async function deleteMemory(data:FormData){
 const {supabase,user}=await getUserContext();const id=field(data,"memory_id",64);if(!id)redirect("/dashboard/memory?error=memory_not_found");
 const {error}=await supabase.from("assistant_memories").delete().eq("id",id).eq("user_id",user.id);if(error)redirect("/dashboard/memory?error=memory_delete_failed");
 revalidatePath("/dashboard/memory");redirect("/dashboard/memory?deleted=1");
}
