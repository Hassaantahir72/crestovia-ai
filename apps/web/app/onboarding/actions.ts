"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
export async function acceptInvitation(data:FormData){
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)redirect("/login");
 const id=String(data.get("membership_id")??"").trim();if(!id)redirect("/onboarding?error=invalid_invitation");
 let admin:ReturnType<typeof createAdminClient>;try{admin=createAdminClient()}catch{redirect("/onboarding?error=admin_secret_missing")}
 const {data:pendingMembership,error:lookupError}=await admin.from("memberships").select("id,organization_id").eq("id",id).eq("user_id",user.id).eq("status","invited").maybeSingle();
 if(lookupError||!pendingMembership)redirect("/onboarding?error=invitation_unavailable");
 const {data:trackedInvitation,error:trackingError}=await admin.from("organization_invitations").update({status:"accepted",accepted_at:new Date().toISOString()}).eq("organization_id",pendingMembership.organization_id).eq("invited_user_id",user.id).eq("status","pending").select("id").maybeSingle();
 if(trackingError)redirect("/onboarding?error=invitation_unavailable");
 const {data:membership,error}=await admin.from("memberships").update({status:"active"}).eq("id",id).eq("user_id",user.id).eq("status","invited").select("id,organization_id").maybeSingle();
 if(error||!membership){if(trackedInvitation)await admin.from("organization_invitations").update({status:"pending",accepted_at:null}).eq("id",trackedInvitation.id).eq("status","accepted");redirect("/onboarding?error=invitation_unavailable")}
 await admin.from("audit_logs").insert({organization_id:membership.organization_id,actor_id:user.id,action:"membership.invitation.accepted",entity_type:"membership",entity_id:membership.id});
 revalidatePath("/dashboard");redirect("/dashboard");
}
