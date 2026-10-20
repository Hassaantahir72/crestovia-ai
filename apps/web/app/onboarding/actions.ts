"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
export async function acceptInvitation(data:FormData){
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)redirect("/login");
 const id=String(data.get("membership_id")??"").trim();if(!id)redirect("/onboarding?error=invalid_invitation");
 let admin:ReturnType<typeof createAdminClient>;try{admin=createAdminClient()}catch{redirect("/onboarding?error=admin_secret_missing")}
 const {data:membership,error}=await admin.from("memberships").update({status:"active"}).eq("id",id).eq("user_id",user.id).eq("status","invited").select("id,organization_id").maybeSingle();
 if(error||!membership)redirect("/onboarding?error=invitation_unavailable");
 await admin.from("audit_logs").insert({organization_id:membership.organization_id,actor_id:user.id,action:"membership.invitation.accepted",entity_type:"membership",entity_id:membership.id});
 revalidatePath("/dashboard");redirect("/dashboard");
}
