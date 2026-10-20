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
 const now=Date.now();const {data:recentChallenges}=await admin.from("email_mfa_challenges").select("created_at").eq("user_id",user.id).gte("created_at",new Date(now-60*60_000).toISOString()).order("created_at",{ascending:false}).limit(5);
 if((recentChallenges?.length??0)>=5)return NextResponse.json({error:"hourly_rate_limit"},{status:429});
 const recent=recentChallenges?.[0];if(recent&&now-new Date(recent.created_at).getTime()<60_000)return NextResponse.json({error:"resend_cooldown",retryAfterSeconds:Math.ceil((60_000-(now-new Date(recent.created_at).getTime()))/1000)},{status:429});
 const code=randomInt(0,1_000_000).toString().padStart(6,"0");let codeHash:string;try{codeHash=hashEmailCode(user.id,sessionId,code)}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const issuedAt=new Date().toISOString();await admin.from("email_mfa_challenges").update({used_at:issuedAt}).eq("user_id",user.id).eq("session_id",sessionId).is("used_at",null);
 const {data:challenge,error:insertError}=await admin.from("email_mfa_challenges").insert({user_id:user.id,session_id:sessionId,email_to:user.email,code_hash:codeHash,expires_at:new Date(now+10*60_000).toISOString(),attempt_count:0}).select("id").single();
 if(insertError||!challenge)return NextResponse.json({error:"challenge_create_failed"},{status:500});
 const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resendKey,"Content-Type":"application/json"},body:JSON.stringify({from:fromEmail,to:[user.email],subject:"Your Crestovia AI verification code",text:"Your Crestovia AI verification code is "+code+". It expires in 10 minutes. Do not share this code with anyone.",html:"<p>Your Crestovia AI verification code is:</p><p style=\"font-size:28px;font-weight:700;letter-spacing:6px\">"+code+"</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>"}),cache:"no-store"});
 if(!mail.ok){await admin.from("email_mfa_challenges").update({used_at:new Date().toISOString()}).eq("id",challenge.id);return NextResponse.json({error:"email_delivery_failed"},{status:502})}
 return NextResponse.json({ok:true,maskedEmail:maskEmail(user.email)});
}
