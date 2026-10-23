import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {MfaSettings} from "./mfa-settings";
import {getActiveOrganizationMembership} from "@/lib/organizations/active-membership";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function SecurityPage({searchParams}:Props){
 const params=await searchParams,supabase=await createClient();const emailMfaConfigured=Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.APP_MFA_SECRET&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL);const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {membership}=await getActiveOrganizationMembership(supabase,user);if(!membership)redirect("/onboarding");const isOwner=membership.role==="owner";
 return <main className="container"><nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/projects">Projects</Link></nav><header className="page-header"><div><p className="brand">CRESTOVIA AI / SECURITY</p><h1>Account security</h1><p className="muted">Signed in as {user.email}</p></div></header>
 {params.required==="1"?<p className="notice notice-error">{isOwner?"Set up and verify an authenticator before opening the owner workspace.":"Complete the requested security step."}</p>:null}
 <section className="panel"><h2>Two-factor authentication</h2><p className="muted">Owner access supports a one-time code sent to the verified account email when the private email-provider settings are configured. An authenticator app remains available as a fallback. Email codes expire after 10 minutes, have a resend cooldown and attempt limit, and are stored only as keyed hashes.</p><p className={emailMfaConfigured?"notice notice-success":"notice notice-error"}>{emailMfaConfigured?"Email-code delivery settings are present. Verify delivery with a real test login before relying on them.":"Email-code delivery is not configured yet. Authenticator-app setup remains available as the fallback."}</p><MfaSettings/></section></main>;
}
