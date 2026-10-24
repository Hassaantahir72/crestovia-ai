import "server-only";

type UserIdentity = { id: string };
type SupabaseLike = {
  from: (table: string) => any;
};

export async function getActiveOrganizationMembership(supabase: SupabaseLike, user: UserIdentity) {
  const { data, error } = await supabase
    .from("memberships")
    .select("organization_id,role,status,organizations(id,name,slug)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return { membership: null };
  return { membership: data };
}
