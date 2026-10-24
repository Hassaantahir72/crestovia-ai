"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";

async function context() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase, membership.role);
  return { supabase, user, membership };
}
function value(data: FormData, key: string, max: number) {
  return String(data.get(key) ?? "").trim().slice(0, max);
}

export async function createChannel(data: FormData) {
  const { supabase, user, membership } = await context();
  if (!["owner", "admin", "manager"].includes(membership.role)) redirect("/dashboard/team-chat?error=channel_permission");
  const name = value(data, "name", 80).replace(/^#+/, "").trim();
  if (name.length < 2) redirect("/dashboard/team-chat?error=invalid_channel");
  const { data: created, error } = await supabase.from("team_conversations").insert({
    organization_id: membership.organization_id, kind: "channel", name, created_by: user.id,
  }).select("id").single();
  if (error || !created) redirect("/dashboard/team-chat?error=channel_create_failed");
  revalidatePath("/dashboard/team-chat");
  redirect("/dashboard/team-chat?conversation=" + created.id);
}

export async function startDirectConversation(data: FormData) {
  const { supabase, user, membership } = await context();
  const otherUserId = value(data, "user_id", 64);
  if (!otherUserId || otherUserId === user.id) redirect("/dashboard/team-chat?error=invalid_teammate");
  const { data: other } = await supabase.from("memberships").select("user_id").eq("organization_id", membership.organization_id).eq("user_id", otherUserId).eq("status", "active").maybeSingle();
  if (!other) redirect("/dashboard/team-chat?error=invalid_teammate");
  const { data: conversationId, error } = await supabase.rpc("create_direct_team_conversation", {
    p_organization_id: membership.organization_id, p_other_user_id: otherUserId,
  });
  if (error || !conversationId) redirect("/dashboard/team-chat?error=direct_create_failed");
  revalidatePath("/dashboard/team-chat");
  redirect("/dashboard/team-chat?conversation=" + conversationId);
}

export async function sendTeamMessage(data: FormData) {
  const { supabase, user, membership } = await context();
  const conversationId = value(data, "conversation_id", 64);
  const body = value(data, "body", 12000);
  if (!conversationId || !body) redirect("/dashboard/team-chat?error=empty_message");
  const { data: conversation } = await supabase.from("team_conversations").select("id").eq("id", conversationId).eq("organization_id", membership.organization_id).maybeSingle();
  if (!conversation) redirect("/dashboard/team-chat?error=conversation_unavailable");
  const { error } = await supabase.from("team_messages").insert({
    organization_id: membership.organization_id, conversation_id: conversationId, author_id: user.id, body,
  });
  if (error) redirect("/dashboard/team-chat?conversation=" + conversationId + "&error=message_send_failed");
  await supabase.from("team_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId).eq("organization_id", membership.organization_id);
  revalidatePath("/dashboard/team-chat");
  redirect("/dashboard/team-chat?conversation=" + conversationId);
}
