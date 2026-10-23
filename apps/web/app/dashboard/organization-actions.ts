"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/organizations/active-membership";

export async function selectActiveOrganization(data: FormData) {
  const organizationId = String(data.get("organization_id") ?? "").trim();
  if (!organizationId || organizationId.length > 64) redirect("/dashboard?error=invalid_organization");

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // Never trust the submitted organization ID: verify current active membership.
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership) redirect("/dashboard?error=organization_unavailable");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, membership.organization_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
