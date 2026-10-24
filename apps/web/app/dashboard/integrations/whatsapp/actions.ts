"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enforceOwnerMfa } from "@/lib/security/owner-mfa";
import { getActiveOrganizationMembership } from "@/lib/organizations/active-membership";
function field(data: FormData, key: string, max: number) { return String(data.get(key) ?? "").trim().slice(0, max); }

export async function sendWhatsAppMessage(data: FormData) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase, membership.role);
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard/integrations/whatsapp?error=permission");
  const to = field(data, "to", 32).replace(/[\s()+-]/g, ""), body = field(data, "body", 4000);
  if (!/^\d{8,15}$/.test(to) || !body) redirect("/dashboard/integrations/whatsapp?error=invalid_message");
  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID, token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID, version = process.env.WHATSAPP_API_VERSION;
  if (!organizationId || organizationId !== membership.organization_id || !token || !phoneId || !version || !/^v\d+\.\d+$/.test(version)) redirect("/dashboard/integrations/whatsapp?error=not_configured");
  let providerId = "";
  try {
    const response = await fetch("https://graph.facebook.com/" + version + "/" + phoneId + "/messages", {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000),
    });
    const result = await response.json() as { messages?: Array<{ id?: string }> };
    if (!response.ok || !result.messages?.[0]?.id) redirect("/dashboard/integrations/whatsapp?error=provider_failed");
    providerId = result.messages[0].id;
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/dashboard/integrations/whatsapp?error=provider_failed");
  }
  try {
    const { error: logError } = await createAdminClient().from("whatsapp_message_events").insert({
      organization_id: organizationId, provider_message_id: providerId, direction: "outbound",
      from_phone: phoneId, to_phone: to, message_text: body, status: "sent",
    });
    if (logError) redirect("/dashboard/integrations/whatsapp?error=sent_log_failed");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/dashboard/integrations/whatsapp?error=sent_log_failed");
  }
  revalidatePath("/dashboard/integrations/whatsapp");
  redirect("/dashboard/integrations/whatsapp?sent=1");
}


export async function linkWhatsAppStaffSender(data: FormData) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase, membership.role);
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard");
  const userId = field(data, "user_id", 64);
  const phone = field(data, "phone", 32).replace(/\D/g, "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || !/^\d{8,15}$/.test(phone)) {
    redirect("/dashboard/integrations/whatsapp?error=staff_mapping_invalid");
  }
  const { error: insertError } = await supabase.from("whatsapp_staff_senders").insert({
    organization_id: membership.organization_id, user_id: userId, phone_e164: phone, created_by: user.id, active: true,
  });
  if (insertError) redirect("/dashboard/integrations/whatsapp?error=staff_mapping_failed");
  revalidatePath("/dashboard/integrations/whatsapp");
  redirect("/dashboard/integrations/whatsapp?staff_linked=1");
}

export async function unlinkWhatsAppStaffSender(data: FormData) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { membership } = await getActiveOrganizationMembership(supabase, user);
  if (!membership) redirect("/onboarding");
  await enforceOwnerMfa(supabase, membership.role);
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard");
  const id = field(data, "id", 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/dashboard/integrations/whatsapp?error=staff_mapping_invalid");
  }
  const { error: deleteError } = await supabase.from("whatsapp_staff_senders").delete()
    .eq("id", id).eq("organization_id", membership.organization_id);
  if (deleteError) redirect("/dashboard/integrations/whatsapp?error=staff_mapping_failed");
  revalidatePath("/dashboard/integrations/whatsapp");
  redirect("/dashboard/integrations/whatsapp?staff_unlinked=1");
}
