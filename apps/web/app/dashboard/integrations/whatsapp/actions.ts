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
  const to = field(data, "to", 32).replace(/[\s()+-]/g, "");
  const body = field(data, "body", 4000);
  if (!/^\d{8,15}$/.test(to) || !body) redirect("/dashboard/integrations/whatsapp?error=invalid_message");
  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appVersion = process.env.WHATSAPP_API_VERSION;
  if (!organizationId || organizationId !== membership.organization_id || !accessToken || !phoneNumberId || !appVersion || !/^v\d+\.\d+$/.test(appVersion)) {
    redirect("/dashboard/integrations/whatsapp?error=not_configured");
  }
  let providerId = "";
  try {
    const response = await fetch("https://graph.facebook.com/" + appVersion + "/" + phoneNumberId + "/messages", {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000),
    });
    const result = await response.json() as { messages?: Array<{ id?: string }>; error?: { code?: number } };
    if (!response.ok || !result.messages?.[0]?.id) redirect("/dashboard/integrations/whatsapp?error=provider_failed");
    providerId = result.messages[0].id;
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/dashboard/integrations/whatsapp?error=provider_failed");
  }
  try {
    const admin = createAdminClient();
    const { error: logError } = await admin.from("whatsapp_message_events").insert({
      organization_id: organizationId, provider_message_id: providerId, direction: "outbound",
      from_phone: phoneNumberId, to_phone: to, message_text: body, status: "sent",
    });
    if (logError) redirect("/dashboard/integrations/whatsapp?error=sent_log_failed");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/dashboard/integrations/whatsapp?error=sent_log_failed");
  }
  revalidatePath("/dashboard/integrations/whatsapp");
  redirect("/dashboard/integrations/whatsapp?sent=1");
}
