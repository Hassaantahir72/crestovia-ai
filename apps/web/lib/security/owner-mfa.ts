import {redirect} from "next/navigation";
import type {createClient} from "@/lib/supabase/server";
import {hasVerifiedEmailMfa} from "@/lib/security/email-mfa";
type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>;
export async function enforceOwnerMfa(supabase:SupabaseServerClient,role:string){
 if(role!=="owner")return;
 const {data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)redirect("/login");
 if(await hasVerifiedEmailMfa(supabase,user.id))return;
 const [{data:factors,error:factorError},{data:assurance,error:assuranceError}]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
 const hasVerifiedTotp=(factors?.totp??[]).some(f=>f.status==="verified");
 if(!factorError&&!assuranceError&&hasVerifiedTotp&&assurance?.currentLevel==="aal2")return;
 redirect("/login?mfa=required");
}
