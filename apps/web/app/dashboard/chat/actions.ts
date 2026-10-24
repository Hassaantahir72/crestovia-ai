"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";
import {getActiveOrganizationMembership} from "@/lib/organizations/active-membership";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function activeMembership() {
 const supabase = await createClient();
 const {data:{user},error} = await supabase.auth.getUser();
 if (error || !user) redirect("/login");
 const {membership} = await getActiveOrganizationMembership(supabase,user);
 if (!membership) redirect("/onboarding");
 await enforceOwnerMfa(supabase,membership.role);
 return {supabase,user,membership};
}

export async function createTeamChannel(formData:FormData) {
 const {supabase,user,membership} = await activeMembership();
 if (!["owner","admin","manager"].includes(membership.role)) redirect("/dashboard/chat?error=channel_permission");
 const name = String(formData.get("name")??"").trim();
 const description = String(formData.get("description")??"").trim();
 if (name.length < 2 || name.length > 80 || description.length > 500) redirect("/dashboard/chat?error=channel_invalid");
 const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
 if (!slug) redirect("/dashboard/chat?error=channel_invalid");
 const {error} = await supabase.from("team_channels").insert({
  organization_id:membership.organization_id,name,slug,description,visibility:"public",channel_type:"general",created_by:user.id
 });
 if (error) redirect("/dashboard/chat?error=channel_create_failed");
 redirect("/dashboard/chat?created=1");
}

export async function sendTeamMessage(formData:FormData) {
 const {supabase,user,membership} = await activeMembership();
 const channelId = String(formData.get("channel_id")??"");
 const body = String(formData.get("body")??"").trim();
 if (!UUID.test(channelId)) redirect("/dashboard/chat?error=channel_invalid");
 if (!body || body.length > 8000) redirect("/dashboard/chat?channel="+encodeURIComponent(channelId)+"&error=message_invalid");
 const {data:channel,error:channelError} = await supabase.from("team_channels")
  .select("id").eq("id",channelId).eq("organization_id",membership.organization_id).maybeSingle();
 if (channelError || !channel) redirect("/dashboard/chat?error=channel_unavailable");
 const {error} = await supabase.from("team_messages").insert({
  organization_id:membership.organization_id,channel_id:channel.id,author_id:user.id,body
 });
 if (error) redirect("/dashboard/chat?channel="+encodeURIComponent(channelId)+"&error=message_send_failed");
 redirect("/dashboard/chat?channel="+encodeURIComponent(channelId)+"&sent=1");
}

export async function startDirectConversation(formData:FormData) {
 const {supabase,membership} = await activeMembership();
 const otherUserId = String(formData.get("user_id")??"").trim();
 if (!UUID.test(otherUserId)) redirect("/dashboard/chat?error=teammate_invalid");
 const {data:other,error:otherError} = await supabase.from("memberships")
  .select("user_id").eq("organization_id",membership.organization_id)
  .eq("user_id",otherUserId).eq("status","active").maybeSingle();
 if (otherError || !other) redirect("/dashboard/chat?error=teammate_invalid");
 const {data:channelId,error} = await supabase.rpc("create_direct_team_channel",{
  p_organization_id:membership.organization_id,p_other_user_id:otherUserId
 });
 if (error || !channelId) redirect("/dashboard/chat?error=direct_create_failed");
 redirect("/dashboard/chat?channel="+encodeURIComponent(channelId));
}
