"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
async function context() {
  const supabase = await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user) redirect("/login");
  const {data: memberships}=await supabase.from("memberships").select("organization_id,role,status").eq("user_id",user.id).eq("status","active").limit(1);
  if(!memberships?.length) redirect("/onboarding");
  await enforceOwnerMfa(supabase,memberships[0].role);
  return {supabase,user,membership:memberships[0]};
}
function value(data:FormData,key:string,max:number){return String(data.get(key)??"").trim().slice(0,max)}
export async function createProject(data:FormData){
 const {supabase,user,membership}=await context();
 if(membership.role!=="owner") redirect("/dashboard/projects?error=owner_only");
 const name=value(data,"name",160),description=value(data,"description",5000),status=value(data,"status",20)||"planned",priority=value(data,"priority",20)||"medium",due_date=value(data,"due_date",10)||null;
 if(name.length<2||!["planned","active","on_hold","completed","archived"].includes(status)||!["low","medium","high","urgent"].includes(priority)) redirect("/dashboard/projects?error=invalid_input");
 const {error}=await supabase.from("projects").insert({organization_id:membership.organization_id,name,description,status,priority,due_date,created_by:user.id});
 if(error) redirect("/dashboard/projects?error=save_failed");
 revalidatePath("/dashboard");revalidatePath("/dashboard/projects");redirect("/dashboard/projects?created=1");
}
export async function createTask(data:FormData){
 const {supabase,user,membership}=await context();
 const title=value(data,"title",200),description=value(data,"description",5000),project_id=value(data,"project_id",64)||null,assigned_to=value(data,"assigned_to",64)||null,priority=value(data,"priority",20)||"medium",rawDue=value(data,"due_at",32);
 if(title.length<2||!["low","medium","high","urgent"].includes(priority)) redirect("/dashboard/tasks?error=invalid_input");
 if(project_id){const {data:project}=await supabase.from("projects").select("id").eq("id",project_id).eq("organization_id",membership.organization_id).maybeSingle();if(!project)redirect("/dashboard/tasks?error=invalid_project")}
 if(assigned_to){const {data:person}=await supabase.from("memberships").select("user_id").eq("organization_id",membership.organization_id).eq("user_id",assigned_to).eq("status","active").maybeSingle();if(!person)redirect("/dashboard/tasks?error=invalid_assignee")}
 let due_at:string|null=null;if(rawDue){const parsed=new Date(rawDue);if(Number.isNaN(parsed.getTime()))redirect("/dashboard/tasks?error=invalid_due_date");due_at=parsed.toISOString()}
 const {error}=await supabase.from("tasks").insert({organization_id:membership.organization_id,project_id,title,description,priority,assigned_to,due_at,created_by:user.id});
 if(error)redirect("/dashboard/tasks?error=save_failed");
 revalidatePath("/dashboard");revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?created=1");
}
export async function updateTaskStatus(data:FormData){
 const {supabase,membership}=await context();const id=value(data,"task_id",64),status=value(data,"status",20);
 if(!id||!["todo","in_progress","blocked","in_review","done","cancelled"].includes(status))redirect("/dashboard/tasks?error=invalid_update");
 const {error}=await supabase.from("tasks").update({status,completed_at:status==="done"?new Date().toISOString():null}).eq("id",id).eq("organization_id",membership.organization_id);
 if(error)redirect("/dashboard/tasks?error=save_failed");revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?updated=1");
}
export async function assignProjectMember(data:FormData){
 const {supabase,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const project_id=value(data,"project_id",64),user_id=value(data,"user_id",64),access_level=value(data,"access_level",20)||"contributor";
 if(!project_id||!user_id||!["viewer","contributor","manager"].includes(access_level))redirect("/dashboard/team?error=invalid_assignment");
 const [{data:project},{data:person}]=await Promise.all([supabase.from("projects").select("id").eq("id",project_id).eq("organization_id",membership.organization_id).maybeSingle(),supabase.from("memberships").select("user_id").eq("organization_id",membership.organization_id).eq("user_id",user_id).eq("status","active").maybeSingle()]);
 if(!project||!person)redirect("/dashboard/team?error=invalid_assignment");
 const {error}=await supabase.from("project_memberships").upsert({organization_id:membership.organization_id,project_id,user_id,access_level},{onConflict:"project_id,user_id"});
 if(error)redirect("/dashboard/team?error=save_failed");revalidatePath("/dashboard/team");redirect("/dashboard/team?assigned=1");
}
export async function removeProjectMember(data:FormData){
 const {supabase,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const id=value(data,"assignment_id",64);if(!id)redirect("/dashboard/team?error=invalid_assignment");
 const {error}=await supabase.from("project_memberships").delete().eq("id",id).eq("organization_id",membership.organization_id);
 if(error)redirect("/dashboard/team?error=save_failed");revalidatePath("/dashboard/team");redirect("/dashboard/team?removed=1");
}

export async function updateMemberAccess(data:FormData){
 const {supabase,user,membership}=await context();
 if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const targetUserId=value(data,"user_id",64),role=value(data,"role",20),status=value(data,"status",20);
 if(!targetUserId||targetUserId===user.id)redirect("/dashboard/team?error=cannot_change_owner");
 if(!["admin","manager","member","guest"].includes(role)||!["active","suspended"].includes(status))redirect("/dashboard/team?error=invalid_member_access");
 const {data:target}=await supabase.from("memberships").select("user_id,role").eq("organization_id",membership.organization_id).eq("user_id",targetUserId).maybeSingle();
 if(!target||target.role==="owner")redirect("/dashboard/team?error=cannot_change_owner");
 const {error}=await supabase.from("memberships").update({role,status}).eq("organization_id",membership.organization_id).eq("user_id",targetUserId);
 if(error)redirect("/dashboard/team?error=member_update_failed");
 revalidatePath("/dashboard/team");revalidatePath("/dashboard/projects");revalidatePath("/dashboard/tasks");redirect("/dashboard/team?member_updated=1");
}

export async function addTaskComment(data:FormData){
 const {supabase,user,membership}=await context();const taskId=value(data,"task_id",64),body=value(data,"body",10000);
 if(!taskId||!body)redirect("/dashboard/tasks?error=invalid_comment");
 const {data:task}=await supabase.from("tasks").select("id").eq("id",taskId).eq("organization_id",membership.organization_id).maybeSingle();if(!task)redirect("/dashboard/tasks?error=task_not_available");
 const {error}=await supabase.from("task_comments").insert({organization_id:membership.organization_id,task_id:taskId,author_id:user.id,body});
 if(error)redirect("/dashboard/tasks?error=comment_not_allowed");revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?comment_added=1");
}
export async function deleteTaskComment(data:FormData){
 const {supabase,user,membership}=await context();const id=value(data,"comment_id",64);if(!id)redirect("/dashboard/tasks?error=invalid_comment");
 const {error}=await supabase.from("task_comments").delete().eq("id",id).eq("organization_id",membership.organization_id).eq("author_id",user.id);
 if(error)redirect("/dashboard/tasks?error=comment_delete_failed");revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?comment_deleted=1");
}

export async function inviteTeamMember(data:FormData){
 const {supabase,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const email=value(data,"email",254).toLowerCase(),role=value(data,"role",20)||"member";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect("/dashboard/team?error=invalid_email");
 if(!["admin","manager","member","guest"].includes(role))redirect("/dashboard/team?error=invalid_role");
 let adminClient:ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
 try{const {createAdminClient}=await import("@/lib/supabase/admin");adminClient=createAdminClient()}catch{redirect("/dashboard/team?error=admin_secret_missing")}
 const {data:invitation,error:inviteError}=await adminClient.auth.admin.inviteUserByEmail(email);
 if(inviteError||!invitation.user){const msg=inviteError?.message.toLowerCase()??"";if(msg.includes("already")||msg.includes("registered"))redirect("/dashboard/team?error=account_exists");redirect("/dashboard/team?error=invite_failed")}
 const invitedId=invitation.user.id;
 const {data:existing}=await supabase.from("memberships").select("user_id,status").eq("organization_id",membership.organization_id).eq("user_id",invitedId).maybeSingle();
 if(existing?.status==="active")redirect("/dashboard/team?error=already_member");
 const {error:membershipError}=await supabase.from("memberships").upsert({organization_id:membership.organization_id,user_id:invitedId,role,status:"invited"},{onConflict:"organization_id,user_id"});
 if(membershipError)redirect("/dashboard/team?error=membership_invite_failed");
 revalidatePath("/dashboard/team");redirect("/dashboard/team?invited=1");
}

export async function createApprovalRequest(data:FormData){
 const {supabase,user,membership}=await context();const actionType=value(data,"action_type",32)||"other",summary=value(data,"summary",200),details=value(data,"details",4000);
 if(!["external_write","send_email","send_message","calendar_change","data_export","other"].includes(actionType))redirect("/dashboard/approvals?error=invalid_action_type");
 if(summary.length<3)redirect("/dashboard/approvals?error=invalid_summary");
 const {error}=await supabase.from("action_approval_requests").insert({organization_id:membership.organization_id,requested_by:user.id,action_type:actionType,summary,details});
 if(error)redirect("/dashboard/approvals?error=request_failed");revalidatePath("/dashboard/approvals");redirect("/dashboard/approvals?created=1");
}
export async function reviewApprovalRequest(data:FormData){
 const {supabase,user,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/approvals?error=owner_only");
 const id=value(data,"request_id",64),decision=value(data,"decision",16),reviewNote=value(data,"review_note",1000);
 if(!id||!["approved","rejected"].includes(decision))redirect("/dashboard/approvals?error=invalid_decision");
 const {data:request,error}=await supabase.from("action_approval_requests").update({status:decision,reviewed_by:user.id,reviewed_at:new Date().toISOString(),review_note:reviewNote}).eq("id",id).eq("organization_id",membership.organization_id).eq("status","pending").gt("expires_at",new Date().toISOString()).select("id").maybeSingle();
 if(error||!request)redirect("/dashboard/approvals?error=request_not_pending");revalidatePath("/dashboard/approvals");redirect("/dashboard/approvals?reviewed=1");
}
