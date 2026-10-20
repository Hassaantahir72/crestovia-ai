import {randomInt} from "node:crypto";
import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {hashEmailCode,maskEmail} from "@/lib/security/email-mfa";
export const runtime="nodejs";
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:"invalid_origin"},{status:403});
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)return NextResponse.json({error:"not_authenticated"},{status:401});
 const {data:memberships}=await supabase.from("memberships").select("role").eq("user_id",user.id).eq("status","active");if(!memberships?.some(m=>m.role==="owner"))return NextResponse.json({error:"owner_only"},{status:403});
 if(!user.email||!user.email_confirmed_at)return NextResponse.json({error:"verified_email_required"},{status:403});
 const resendKey=process.env.RESEND_API_KEY,fromEmail=process.env.RESEND_FROM_EMAIL,appSecret=process.env.APP_MFA_SECRET,serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!resendKey||!fromEmail||!appSecret||appSecret.length<32||!serviceRole)return NextResponse.json({error:"email_mfa_not_configured"},{status:503});
 const {data:claimsData,error:claimsError}=await supabase.auth.getClaims();const sessionId=claimsData?.claims?.session_id;if(claimsError||typeof sessionId!=="string")return NextResponse.json({error:"session_unavailable"},{status:401});
 let admin:ReturnType<typeof createAdminClient>;try{admin=createAdminClient()}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const now=Date.now();
 const code=randomInt(0,1_000_000).toString().padStart(6,"0");let codeHash:string;try{codeHash=hashEmailCode(user.id,sessionId,code)}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const {data:issuedRows,error:issueError}=await admin.rpc("issue_email_mfa_challenge",{
  p_user_id:user.id,p_session_id:sessionId,p_email_to:user.email,p_code_hash:codeHash,
  p_expires_at:new Date(now+10*60_000).toISOString()
 });
 const issued=Array.isArray(issuedRows)?issuedRows[0]:null;
 if(issueError||!issued)return NextResponse.json({error:"challenge_create_failed"},{status:500});
 if(issued.outcome==="hourly_rate_limit")return NextResponse.json({error:"hourly_rate_limit"},{status:429});
 if(issued.outcome==="resend_cooldown")return NextResponse.json({error:"resend_cooldown",retryAfterSeconds:issued.retry_after_seconds??60},{status:429});
 if(issued.outcome!=="issued"||typeof issued.challenge_id!=="string")return NextResponse.json({error:"challenge_create_failed"},{status:500});
 const challenge={id:issued.challenge_id};
 const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resendKey,"Content-Type":"application/json"},body:JSON.stringify({from:fromEmail,to:[user.email],subject:"Your Crestovia AI verification code",text:"Your Crestovia AI verification code is "+code+". It expires in 10 minutes. Do not share this code with anyone.",html:"<p>Your Crestovia AI verification code is:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:6px\">"+code+"</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>"}),cache:"no-store"});
 if(!mail.ok){await admin.from("email_mfa_challenges").update({used_at:new Date().toISOString()}).eq("id",challenge.id);return NextResponse.json({error:"email_delivery_failed"},{status:502})}
 return NextResponse.json({ok:true,maskedEmail:maskEmail(user.email)});
}
