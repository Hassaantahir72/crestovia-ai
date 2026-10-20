import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {MfaSettings} from "./mfa-settings";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function SecurityPage({searchParams}:Props){
 const params=await searchParams,supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("organization_id,role,status").eq("user_id",user.id).eq("status","active").limit(1);if(!memberships?.length)redirect("/onboarding");const isOwner=memberships[0].role==="owner";
 return <main className="container"><nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/projects">Projects</Link></nav><header className="page-header"><div><p className="brand">CRESTOVIA AI / SECURITY</p><h1>Account security</h1><p className="muted">Signed in as {user.email}</p></div></header>
 {params.required==="1"?<p className="notice notice-error">{isOwner?"Set up and verify an authenticator before opening the owner workspace.":"Complete the requested security step."}</p>:null}
 <section className="panel"><h2>Two-factor authentication</h2><p className="muted">Owner access supports a one-time code sent to the verified account email when the private email-provider settings are configured. An authenticator app remains available as a fallback. Email codes expire after 10 minutes, have a resend cooldown and attempt limit, and are stored only as keyed hashes.</p><MfaSettings/></section></main>;
}
