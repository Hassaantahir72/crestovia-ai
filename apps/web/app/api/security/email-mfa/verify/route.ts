import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {createEmailMfaToken,emailMfaCookieOptions,hashEmailCode,EMAIL_MFA_COOKIE} from "@/lib/security/email-mfa";
export const runtime="nodejs";
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:"invalid_origin"},{status:403});
 let body:{code?:unknown};try{body=await request.json() as {code?:unknown}}catch{return NextResponse.json({error:"invalid_request"},{status:400})}
 const code=typeof body.code==="string"?body.code.trim():"";if(!/^\d{6}$/.test(code))return NextResponse.json({error:"invalid_code"},{status:400});
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)return NextResponse.json({error:"not_authenticated"},{status:401});
 const {data:memberships}=await supabase.from("memberships").select("role").eq("user_id",user.id).eq("status","active").limit(1);if(memberships?.[0]?.role!=="owner")return NextResponse.json({error:"owner_only"},{status:403});
 const {data:claimsData,error:claimsError}=await supabase.auth.getClaims();const sessionId=claimsData?.claims?.session_id;if(claimsError||typeof sessionId!=="string")return NextResponse.json({error:"session_unavailable"},{status:401});
 let admin:ReturnType<typeof createAdminClient>;try{admin=createAdminClient()}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const now=new Date().toISOString();const {data:challenge,error}=await admin.from("email_mfa_challenges").select("id,code_hash,attempt_count,expires_at").eq("user_id",user.id).eq("session_id",sessionId).is("used_at",null).gt("expires_at",now).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(error||!challenge)return NextResponse.json({error:"challenge_expired"},{status:400});
 if(challenge.attempt_count>=5){await admin.from("email_mfa_challenges").update({used_at:now}).eq("id",challenge.id).is("used_at",null);return NextResponse.json({error:"too_many_attempts"},{status:429})}
 let candidate:string;try{candidate=hashEmailCode(user.id,sessionId,code)}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const expected=Buffer.from(challenge.code_hash),actual=Buffer.from(candidate),valid=expected.length===actual.length&&timingSafeEqual(expected,actual);
 if(!valid){const attempts=challenge.attempt_count+1;await admin.from("email_mfa_challenges").update({attempt_count:attempts,used_at:attempts>=5?now:null}).eq("id",challenge.id).is("used_at",null);return NextResponse.json({error:attempts>=5?"too_many_attempts":"invalid_code"},{status:attempts>=5?429:400})}
 const {data:consumed,error:consumeError}=await admin.from("email_mfa_challenges").update({used_at:now}).eq("id",challenge.id).is("used_at",null).select("id").maybeSingle();if(consumeError||!consumed)return NextResponse.json({error:"challenge_already_used"},{status:409});
 let token:string;try{token=createEmailMfaToken(user.id,sessionId)}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const store=await cookies();store.set(EMAIL_MFA_COOKIE,token,emailMfaCookieOptions());return NextResponse.json({ok:true});
}
