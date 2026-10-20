import {redirect} from "next/navigation";
import type {createClient} from "@/lib/supabase/server";
import {hasVerifiedEmailMfa} from "@/lib/security/email-mfa";
type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>;
export async function enforceOwnerMfa(supabase:SupabaseServerClient,role:string){
 const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)redirect("/login");
 const {data:activeMemberships}=await supabase.from("memberships").select("role").eq("user_id",user.id).eq("status","active");const isOwner=role==="owner"||(activeMemberships??[]).some(m=>m.role==="owner");if(!isOwner)return;
 if(await hasVerifiedEmailMfa(supabase,user.id))return;
 const [{data:factors,error:factorError},{data:assurance,error:assuranceError}]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
 const hasVerifiedTotp=(factors?.totp??[]).some(f=>f.status==="verified");
 if(!factorError&&!assuranceError&&hasVerifiedTotp&&assurance?.currentLevel==="aal2")return;
 redirect("/login?mfa=required");
}
