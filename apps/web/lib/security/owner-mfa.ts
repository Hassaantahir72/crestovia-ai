import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
export async function enforceOwnerMfa(supabase: SupabaseServerClient, role: string) {
  if (role !== "owner") return;
  const [{data:factors,error:factorError},{data:assurance,error:assuranceError}] = await Promise.all([
    supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);
  if (factorError || assuranceError) redirect("/dashboard/security?required=1&error=mfa_check_failed");
  const verified = (factors?.totp ?? []).some(factor => factor.status === "verified");
  if (!verified) redirect("/dashboard/security?required=1");
  if (assurance?.currentLevel !== "aal2") redirect("/login?mfa=required");
}
