"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";

async function notificationContext(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("organization_id,role").eq("user_id",user.id).eq("status","active").limit(1);
 if(!memberships?.length)redirect("/onboarding");
 await enforceOwnerMfa(supabase,memberships[0].role);
 return {supabase,user,membership:memberships[0]};
}
export async function markNotificationRead(data:FormData){
 const {supabase,user,membership}=await notificationContext();
 const id=String(data.get("notification_id")??"").trim().slice(0,64);
 if(!id)redirect("/dashboard/notifications?error=invalid_notification");
 const {data:updated,error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("recipient_id",user.id).eq("organization_id",membership.organization_id).is("read_at",null).select("id").maybeSingle();
 if(error||!updated)redirect("/dashboard/notifications?error=notification_unavailable");
 revalidatePath("/dashboard/notifications");revalidatePath("/dashboard");
 redirect("/dashboard/notifications?read=1");
}
export async function markAllNotificationsRead(){
 const {supabase,user,membership}=await notificationContext();
 const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",user.id).eq("organization_id",membership.organization_id).is("read_at",null);
 if(error)redirect("/dashboard/notifications?error=update_failed");
 revalidatePath("/dashboard/notifications");revalidatePath("/dashboard");
 redirect("/dashboard/notifications?read_all=1");
}
