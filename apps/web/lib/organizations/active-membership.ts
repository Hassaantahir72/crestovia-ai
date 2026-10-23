import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const ACTIVE_ORGANIZATION_COOKIE = "crestovia_active_organization";

export type OrganizationMembership = {
  organization_id: string;
  role: string;
  status?: string;
  created_at?: string;
  organizations?: { id?: string; name?: string; slug?: string } | { id?: string; name?: string; slug?: string }[] | null;
};

/**
 * Resolve the current user's organization from their active memberships.
 * A cookie is only a preference: the organization is always re-authorized
 * against the authenticated user's current active memberships on every read.
 */
export async function getActiveOrganizationMembership(
  supabase: SupabaseClient,
  user: Pick<User, "id">,
) {
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("organization_id,role,status,created_at,organizations(id,name,slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw new Error("Unable to verify organization membership");
  if (!memberships?.length) return { memberships: [], membership: null };

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const membership =
    memberships.find((item) => item.organization_id === preferredId) ?? memberships[0];

  return { memberships, membership };
}
