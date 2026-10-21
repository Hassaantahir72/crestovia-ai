"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { recordAuditEvent } from "@/lib/security/audit";
import { consumeUserRateLimit } from "@/lib/security/rate-limit";
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
export async function createDepartment(data:FormData){
 const {supabase,user,membership}=await context();
 if(!["owner","admin","manager"].includes(membership.role))redirect("/dashboard/departments?error=manager_only");
 const name=value(data,"name",100),description=value(data,"description",2000);
 if(name.length<2)redirect("/dashboard/departments?error=invalid_name");
 const {data:created,error}=await supabase.from("departments").insert({organization_id:membership.organization_id,name,description,created_by:user.id}).select("id").single();
 if(error||!created)redirect("/dashboard/departments?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"department.created",entityType:"department",entityId:created.id,metadata:{name}});
 revalidatePath("/dashboard");revalidatePath("/dashboard/departments");revalidatePath("/dashboard/projects");redirect("/dashboard/departments?created=1");
}
export async function updateDepartment(data:FormData){
 const {supabase,user,membership}=await context();
 if(!["owner","admin","manager"].includes(membership.role))redirect("/dashboard/departments?error=manager_only");
 const id=value(data,"department_id",64),name=value(data,"name",100),description=value(data,"description",2000);
 if(!id||name.length<2)redirect("/dashboard/departments?error=invalid_input");
 const {data:updated,error}=await supabase.from("departments").update({name,description,updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",membership.organization_id).select("id").maybeSingle();
 if(error||!updated)redirect("/dashboard/departments?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"department.updated",entityType:"department",entityId:updated.id,metadata:{name}});
 revalidatePath("/dashboard/departments");revalidatePath("/dashboard/projects");redirect("/dashboard/departments?updated=1");
}
export async function deleteDepartment(data:FormData){
 const {supabase,user,membership}=await context();
 if(!["owner","admin","manager"].includes(membership.role))redirect("/dashboard/departments?error=manager_only");
 const id=value(data,"department_id",64);if(!id)redirect("/dashboard/departments?error=invalid_input");
 const {data:deleted,error}=await supabase.from("departments").delete().eq("id",id).eq("organization_id",membership.organization_id).select("id").maybeSingle();
 if(error||!deleted)redirect("/dashboard/departments?error=delete_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"department.deleted",entityType:"department",entityId:deleted.id});
 revalidatePath("/dashboard/departments");revalidatePath("/dashboard/projects");redirect("/dashboard/departments?deleted=1");
}

export async function createProject(data:FormData){
 const {supabase,user,membership}=await context();
 if(membership.role!=="owner") redirect("/dashboard/projects?error=owner_only");
 const name=value(data,"name",160),description=value(data,"description",5000),status=value(data,"status",20)||"planned",priority=value(data,"priority",20)||"medium",due_date=value(data,"due_date",10)||null,department_id=value(data,"department_id",64)||null;
 if(name.length<2||!["planned","active","on_hold","completed","archived"].includes(status)||!["low","medium","high","urgent"].includes(priority)) redirect("/dashboard/projects?error=invalid_input");
 if(department_id){const {data:department}=await supabase.from("departments").select("id").eq("id",department_id).eq("organization_id",membership.organization_id).maybeSingle();if(!department)redirect("/dashboard/projects?error=invalid_department")}
 const {data:created,error}=await supabase.from("projects").insert({organization_id:membership.organization_id,name,description,status,priority,due_date,department_id,created_by:user.id}).select("id").single();
 if(error||!created) redirect("/dashboard/projects?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"project.created",entityType:"project",entityId:created.id,metadata:{name,status,priority}});
 revalidatePath("/dashboard");revalidatePath("/dashboard/projects");redirect("/dashboard/projects?created=1");
}
export async function createTask(data:FormData){
 const {supabase,user,membership}=await context();
 const title=value(data,"title",200),description=value(data,"description",5000),project_id=value(data,"project_id",64)||null,assigned_to=value(data,"assigned_to",64)||null,priority=value(data,"priority",20)||"medium",rawDue=value(data,"due_at",32);
 if(title.length<2||!["low","medium","high","urgent"].includes(priority)) redirect("/dashboard/tasks?error=invalid_input");
 if(project_id){const {data:project}=await supabase.from("projects").select("id").eq("id",project_id).eq("organization_id",membership.organization_id).maybeSingle();if(!project)redirect("/dashboard/tasks?error=invalid_project")}
 if(assigned_to){const {data:person}=await supabase.from("memberships").select("user_id").eq("organization_id",membership.organization_id).eq("user_id",assigned_to).eq("status","active").maybeSingle();if(!person)redirect("/dashboard/tasks?error=invalid_assignee")}
 let due_at:string|null=null;if(rawDue){const parsed=new Date(rawDue);if(Number.isNaN(parsed.getTime()))redirect("/dashboard/tasks?error=invalid_due_date");due_at=parsed.toISOString()}
 const {data:created,error}=await supabase.from("tasks").insert({organization_id:membership.organization_id,project_id,title,description,priority,assigned_to,due_at,created_by:user.id}).select("id").single();
 if(error||!created)redirect("/dashboard/tasks?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"task.created",entityType:"task",entityId:created.id,metadata:{title,priority,assigned_to}});
 if(assigned_to&&assigned_to!==user.id){
  const {error:notificationError}=await supabase.from("notifications").insert({organization_id:membership.organization_id,recipient_id:assigned_to,created_by:user.id,type:"task_assigned",title:"A task was assigned to you",body:title,entity_type:"task",entity_id:created.id,dedupe_key:"task_assigned:"+created.id+":"+assigned_to});
  if(notificationError){await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"notification.task_assignment.failed",entityType:"task",entityId:created.id,metadata:{recipient_id:assigned_to}});}
 }
 revalidatePath("/dashboard");revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?created=1");
}
export async function updateTaskStatus(data:FormData){
 const {supabase,user,membership}=await context();const id=value(data,"task_id",64),status=value(data,"status",20);
 if(!id||!["todo","in_progress","blocked","in_review","done","cancelled"].includes(status))redirect("/dashboard/tasks?error=invalid_update");
 const {data:updated,error}=await supabase.from("tasks").update({status,completed_at:status==="done"?new Date().toISOString():null}).eq("id",id).eq("organization_id",membership.organization_id).select("id").maybeSingle();
 if(error||!updated)redirect("/dashboard/tasks?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"task.status.updated",entityType:"task",entityId:updated.id,metadata:{status}});revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?updated=1");
}
export async function assignProjectMember(data:FormData){
 const {supabase,user,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const project_id=value(data,"project_id",64),user_id=value(data,"user_id",64),access_level=value(data,"access_level",20)||"contributor";
 if(!project_id||!user_id||!["viewer","contributor","manager"].includes(access_level))redirect("/dashboard/team?error=invalid_assignment");
 const [{data:project},{data:person}]=await Promise.all([supabase.from("projects").select("id").eq("id",project_id).eq("organization_id",membership.organization_id).maybeSingle(),supabase.from("memberships").select("user_id").eq("organization_id",membership.organization_id).eq("user_id",user_id).eq("status","active").maybeSingle()]);
 if(!project||!person)redirect("/dashboard/team?error=invalid_assignment");
 const {error}=await supabase.from("project_memberships").upsert({organization_id:membership.organization_id,project_id,user_id,access_level},{onConflict:"project_id,user_id"});
 if(error)redirect("/dashboard/team?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"team.project_member.assigned",entityType:"project",entityId:project_id,metadata:{user_id,access_level}});revalidatePath("/dashboard/team");redirect("/dashboard/team?assigned=1");
}
export async function removeProjectMember(data:FormData){
 const {supabase,user,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const id=value(data,"assignment_id",64);if(!id)redirect("/dashboard/team?error=invalid_assignment");
 const {data:removed,error}=await supabase.from("project_memberships").delete().eq("id",id).eq("organization_id",membership.organization_id).select("id,project_id,user_id").maybeSingle();
 if(error||!removed)redirect("/dashboard/team?error=save_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"team.project_member.removed",entityType:"project_membership",entityId:removed.id,metadata:{project_id:removed.project_id,user_id:removed.user_id}});revalidatePath("/dashboard/team");redirect("/dashboard/team?removed=1");
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
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"team.member.access_updated",entityType:"membership",metadata:{user_id:targetUserId,role,status}});
 revalidatePath("/dashboard/team");revalidatePath("/dashboard/projects");revalidatePath("/dashboard/tasks");redirect("/dashboard/team?member_updated=1");
}

export async function addTaskComment(data:FormData){
 const {supabase,user,membership}=await context();const taskId=value(data,"task_id",64),body=value(data,"body",10000);
 if(!taskId||!body)redirect("/dashboard/tasks?error=invalid_comment");
 const {data:task}=await supabase.from("tasks").select("id").eq("id",taskId).eq("organization_id",membership.organization_id).maybeSingle();if(!task)redirect("/dashboard/tasks?error=task_not_available");
 const {data:created,error}=await supabase.from("task_comments").insert({organization_id:membership.organization_id,task_id:taskId,author_id:user.id,body}).select("id").single();
 if(error||!created)redirect("/dashboard/tasks?error=comment_not_allowed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"task.comment.added",entityType:"task_comment",entityId:created.id,metadata:{task_id:taskId}});revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?comment_added=1");
}
export async function deleteTaskComment(data:FormData){
 const {supabase,user,membership}=await context();const id=value(data,"comment_id",64);if(!id)redirect("/dashboard/tasks?error=invalid_comment");
 const {data:deleted,error}=await supabase.from("task_comments").delete().eq("id",id).eq("organization_id",membership.organization_id).eq("author_id",user.id).select("id,task_id").maybeSingle();
 if(error||!deleted)redirect("/dashboard/tasks?error=comment_delete_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"task.comment.deleted",entityType:"task_comment",entityId:deleted.id,metadata:{task_id:deleted.task_id}});revalidatePath("/dashboard/tasks");redirect("/dashboard/tasks?comment_deleted=1");
}

export async function inviteTeamMember(data:FormData){
 const {supabase,user,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const email=value(data,"email",254).toLowerCase(),role=value(data,"role",20)||"member";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))redirect("/dashboard/team?error=invalid_email");
 if(!["admin","manager","member","guest"].includes(role))redirect("/dashboard/team?error=invalid_role");
 let adminClient:ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
 try{const {createAdminClient}=await import("@/lib/supabase/admin");adminClient=createAdminClient()}catch{redirect("/dashboard/team?error=admin_secret_missing")}
 // Check known invitation state before triggering Supabase Auth email delivery.
 const {data:trackedInvitation,error:lookupError}=await adminClient.from("organization_invitations").select("id,invited_user_id,status").eq("organization_id",membership.organization_id).eq("invited_email",email).maybeSingle();
 if(lookupError)redirect("/dashboard/team?error=invite_lookup_failed");
 if(trackedInvitation?.status==="pending")redirect("/dashboard/team?error=invitation_pending");
 if(trackedInvitation?.invited_user_id){
  const {data:existing,error:memberLookupError}=await supabase.from("memberships").select("user_id,status").eq("organization_id",membership.organization_id).eq("user_id",trackedInvitation.invited_user_id).maybeSingle();
  if(memberLookupError)redirect("/dashboard/team?error=invite_lookup_failed");
  if(existing?.status==="active")redirect("/dashboard/team?error=already_member");
 }
 let inviteAllowed:boolean;
 try{
  inviteAllowed=await consumeUserRateLimit(user.id,"team_invite_minute",5,60)
   &&await consumeUserRateLimit(user.id,"team_invite_hour",20,3600)
   &&await consumeUserRateLimit(user.id,"team_invite_day",50,86400);
 }catch{redirect("/dashboard/team?error=invitation_rate_limit_unavailable")}
 if(!inviteAllowed)redirect("/dashboard/team?error=invitation_rate_limited");
 const {data:invitation,error:inviteError}=await adminClient.auth.admin.inviteUserByEmail(email);
 if(inviteError||!invitation.user){const msg=inviteError?.message.toLowerCase()??"";if(msg.includes("already")||msg.includes("registered"))redirect("/dashboard/team?error=account_exists");redirect("/dashboard/team?error=invite_failed")}
 const invitedId=invitation.user.id;
 const {error:membershipError}=await supabase.from("memberships").upsert({organization_id:membership.organization_id,user_id:invitedId,role,status:"invited"},{onConflict:"organization_id,user_id"});
 if(membershipError)redirect("/dashboard/team?error=membership_invite_failed");
 const {error:trackingError}=await adminClient.from("organization_invitations").upsert({organization_id:membership.organization_id,invited_email:email,invited_user_id:invitedId,invited_by:user.id,role,status:"pending",accepted_at:null},{onConflict:"organization_id,invited_email"});
 if(trackingError)redirect("/dashboard/team?error=invite_tracking_failed");
 await adminClient.from("audit_logs").insert({organization_id:membership.organization_id,actor_id:user.id,action:"membership.invitation.sent",entity_type:"organization_invitation",entity_id:invitedId});
 revalidatePath("/dashboard/team");redirect("/dashboard/team?invited=1");
}

export async function revokeTeamInvitation(data:FormData){
 const {supabase,user,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/team?error=owner_only");
 const id=value(data,"invitation_id",64);if(!id)redirect("/dashboard/team?error=invalid_invitation");
 let adminClient:ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
 try{const {createAdminClient}=await import("@/lib/supabase/admin");adminClient=createAdminClient()}catch{redirect("/dashboard/team?error=admin_secret_missing")}
 const {data:invitation,error}=await adminClient.from("organization_invitations").update({status:"revoked"}).eq("id",id).eq("organization_id",membership.organization_id).eq("status","pending").select("id,invited_user_id").maybeSingle();
 if(error||!invitation)redirect("/dashboard/team?error=invitation_unavailable");
 if(invitation.invited_user_id){await adminClient.from("memberships").update({status:"suspended"}).eq("organization_id",membership.organization_id).eq("user_id",invitation.invited_user_id).eq("status","invited");}
 await adminClient.from("audit_logs").insert({organization_id:membership.organization_id,actor_id:user.id,action:"membership.invitation.revoked",entity_type:"organization_invitation",entity_id:invitation.id});
 revalidatePath("/dashboard/team");redirect("/dashboard/team?revoked=1");
}

export async function createApprovalRequest(data:FormData){
 const {supabase,user,membership}=await context();const actionType=value(data,"action_type",32)||"other",summary=value(data,"summary",200),details=value(data,"details",4000);
 if(!["create_task","external_write","send_email","send_message","calendar_change","data_export","other"].includes(actionType))redirect("/dashboard/approvals?error=invalid_action_type");
 if(summary.length<3)redirect("/dashboard/approvals?error=invalid_summary");
 const {data:created,error}=await supabase.from("action_approval_requests").insert({organization_id:membership.organization_id,requested_by:user.id,action_type:actionType,summary,details}).select("id").single();
 if(error||!created)redirect("/dashboard/approvals?error=request_failed");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"approval.request.created",entityType:"action_approval_request",entityId:created.id,metadata:{action_type:actionType}});revalidatePath("/dashboard/approvals");redirect("/dashboard/approvals?created=1");
}
export async function reviewApprovalRequest(data:FormData){
 const {supabase,user,membership}=await context();if(membership.role!=="owner")redirect("/dashboard/approvals?error=owner_only");
 const id=value(data,"request_id",64),decision=value(data,"decision",16),reviewNote=value(data,"review_note",1000);
 if(!id||!["approved","rejected"].includes(decision))redirect("/dashboard/approvals?error=invalid_decision");
 const {data:request,error}=await supabase.from("action_approval_requests").update({status:decision,reviewed_by:user.id,reviewed_at:new Date().toISOString(),review_note:reviewNote}).eq("id",id).eq("organization_id",membership.organization_id).eq("status","pending").gt("expires_at",new Date().toISOString()).select("id,requested_by,summary").maybeSingle();
 if(error||!request)redirect("/dashboard/approvals?error=request_not_pending");
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"approval.request.reviewed",entityType:"action_approval_request",entityId:request.id,metadata:{decision}});
 const {error:notificationError}=await supabase.from("notifications").insert({organization_id:membership.organization_id,recipient_id:request.requested_by,created_by:user.id,type:"approval_reviewed",title:decision==="approved"?"Your approval request was approved":"Your approval request was rejected",body:request.summary,entity_type:"approval_request",entity_id:request.id,dedupe_key:"approval_reviewed:"+request.id});
 if(notificationError){await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"notification.approval_decision.failed",entityType:"action_approval_request",entityId:request.id,metadata:{recipient_id:request.requested_by}});}
 revalidatePath("/dashboard/approvals");revalidatePath("/dashboard/notifications");redirect("/dashboard/approvals?reviewed=1");
}

export async function executeApprovedTaskRequest(data:FormData){
 const {supabase,user,membership}=await context();
 if(membership.role!=="owner")redirect("/dashboard/approvals?error=owner_only");
 const id=value(data,"request_id",64);
 if(!id)redirect("/dashboard/approvals?error=execution_unavailable");
 const {data:result,error}=await supabase.rpc("execute_approved_task_request",{p_request_id:id,p_organization_id:membership.organization_id});
 if(error||!Array.isArray(result)||!result[0]?.task_id){
  const reason=error?.message??"unexpected_result";
  await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"approval.request.execution_failed",entityType:"action_approval_request",entityId:id,metadata:{action_type:"create_task",reason:reason.includes("already_started")?"already_started":reason.includes("expired")?"expired":reason.includes("not_approved")?"not_approved":"execution_error"}});
  if(reason.includes("already_started"))redirect("/dashboard/approvals?error=execution_already_started");
  if(reason.includes("expired")||reason.includes("not_approved")||reason.includes("not_found"))redirect("/dashboard/approvals?error=execution_unavailable");
  if(reason.includes("unsupported_action"))redirect("/dashboard/approvals?error=unsupported_execution");
  redirect("/dashboard/approvals?error=execution_failed");
 }
 const taskId=String(result[0].task_id);
 await recordAuditEvent({organizationId:membership.organization_id,actorId:user.id,action:"approval.request.executed",entityType:"action_approval_request",entityId:id,metadata:{action_type:"create_task",task_id:taskId}});
 revalidatePath("/dashboard");revalidatePath("/dashboard/tasks");revalidatePath("/dashboard/approvals");
 redirect("/dashboard/approvals?executed=1");
}
