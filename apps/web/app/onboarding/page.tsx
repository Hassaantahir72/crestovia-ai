import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {OrganizationForm} from "./organization-form";
import {acceptInvitation} from "./actions";
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export default async function OnboardingPage({searchParams}:Props){
 const params=await searchParams,supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("id").eq("user_id",user.id).eq("status","active").limit(1);if(memberships?.length)redirect("/dashboard");
 const {data:invitations}=await supabase.from("memberships").select("id,organization_id,role,status,organizations(name)").eq("user_id",user.id).eq("status","invited").order("created_at",{ascending:false});
 const errorMessage=typeof params.error==="string"?params.error.replaceAll("_"," "):"";
 return <main className="container"><div className="panel" style={{maxWidth:680,margin:"7vh auto"}}><p className="brand">CRESTOVIA AI</p><h1>Welcome to Crestovia AI</h1><p className="muted">Accept a company invitation to join a team, or create a separate workspace if you need to own one.</p>
 {errorMessage?<p className="notice notice-error">Could not complete that action: {errorMessage}. If the admin key is missing, ask the workspace owner to configure it privately.</p>:null}
 {invitations?.length?<section style={{marginBottom:24}}><h2>Pending invitations</h2>{invitations.map(inv=>{const org=Array.isArray(inv.organizations)?inv.organizations[0]:inv.organizations;return <article className="panel" style={{marginBottom:12}} key={inv.id}><h3>{org?.name??"Company workspace"}</h3><p className="muted">Invited role: {inv.role}</p><form action={acceptInvitation}><input type="hidden" name="membership_id" value={inv.id}/><button className="button" type="submit">Accept invitation</button></form></article>})}</section>:null}
 <section><h2>Create a separate workspace</h2><p className="muted">The account creating the first workspace becomes its owner.</p><OrganizationForm/></section></div></main>;
}
