import {redirect} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {enforceOwnerMfa} from "@/lib/security/owner-mfa";

type Check = {name:string;purpose:string;configured:boolean;required:boolean};

export default async function ReadinessPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:memberships}=await supabase.from("memberships").select("role").eq("user_id",user.id).eq("status","active");
 if(!memberships?.length)redirect("/onboarding");
 const isOwner=memberships.some(m=>m.role==="owner");
 if(!isOwner)redirect("/dashboard");
 await enforceOwnerMfa(supabase,"owner");

 const checks:Check[]=[
  {name:"Supabase project URL",purpose:"Browser authentication and database connection",configured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),required:true},
  {name:"Supabase publishable key",purpose:"Browser-safe Supabase client",configured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),required:true},
  {name:"Supabase service-role key",purpose:"Server-only invitation and protected MFA operations",configured:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),required:true},
  {name:"Owner MFA secret",purpose:"Hashing email codes and signing session-bound MFA cookies",configured:Boolean(process.env.APP_MFA_SECRET&&process.env.APP_MFA_SECRET.length>=32),required:true},
  {name:"Groq API key",purpose:"AI assistant responses and provider test",configured:Boolean(process.env.GROQ_API_KEY),required:false},
  {name:"Resend API key",purpose:"Email and notification delivery",configured:Boolean(process.env.RESEND_API_KEY),required:false},
  {name:"Resend sender address",purpose:"Verified sender identity for outbound email",configured:Boolean(process.env.RESEND_FROM_EMAIL),required:false},
  {name:"Resend webhook secret",purpose:"Authenticating delivery-event webhooks",configured:Boolean(process.env.RESEND_WEBHOOK_SECRET),required:false},
  {name:"Reminder cron secret",purpose:"Authorizing scheduled reminder sweeps",configured:Boolean(process.env.CRON_SECRET&&process.env.CRON_SECRET.length>=32),required:false},
 ];
 const requiredMissing=checks.filter(c=>c.required&&!c.configured).length;
 const optionalMissing=checks.filter(c=>!c.required&&!c.configured).length;
 return <main className="container">
  <nav className="workspace-nav"><Link href="/dashboard">← Dashboard</Link><Link href="/dashboard/security">Account security</Link><Link href="/dashboard/assistant">AI assistant</Link></nav>
  <header className="page-header"><div><p className="brand">CRESTOVIA AI / OWNER TOOLS</p><h1>Launch readiness</h1><p className="muted">A private checklist of server configuration. Secret values are never displayed or sent to the browser.</p></div></header>
  <section className="panel">
   <h2>Configuration snapshot</h2>
   <p className="muted">This page checks whether required environment variables are present. It does not prove that credentials are valid, providers are reachable, email is delivered, or production is safe to launch.</p>
   <div className="grid">
    <article className="panel"><p className="muted">Required settings missing</p><strong>{requiredMissing}</strong></article>
    <article className="panel"><p className="muted">Optional integrations not configured</p><strong>{optionalMissing}</strong></article>
   </div>
   {requiredMissing>0?<p className="notice notice-error">Required server configuration is incomplete. Add missing values privately in the hosting environment, then restart or redeploy.</p>:<p className="notice notice-success">Required variable presence checks passed. Continue with live authentication and security acceptance tests.</p>}
  </section>
  <section className="panel"><h2>Server settings</h2><div style={{display:"grid",gap:12}}>
   {checks.map(check=><article key={check.name} className="panel">
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start",flexWrap:"wrap"}}>
     <div><strong>{check.name}</strong><p className="muted">{check.purpose}</p></div>
     <span className="role-pill">{check.configured?"Detected":check.required?"Missing":"Not configured"}</span>
    </div>
   </article>)}
  </div></section>
  <section className="panel"><h2>Before deployment</h2><ul>
   <li>Run the two-organization access test with owner, admin, member, and suspended accounts.</li>
   <li>Use the AI assistant page to test a real Groq request after configuring the key.</li>
   <li>Verify a real email delivery and signed webhook event before relying on email workflows.</li>
   <li>Confirm backup retention and complete a staging restore drill.</li>
   <li>Keep public deployment disabled until the owner approves launch.</li>
  </ul><p className="muted">No secret values, tokens, or connection strings are rendered by this page.</p></section>
 </main>;
}
