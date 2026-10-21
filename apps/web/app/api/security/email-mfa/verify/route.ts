import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {createEmailMfaToken,emailMfaCookieOptions,hashEmailCode,EMAIL_MFA_COOKIE} from "@/lib/security/email-mfa";
export const runtime="nodejs";
const MAX_REQUEST_BODY_BYTES=4_096;

type BoundedBodyResult={ok:true;body:string}|{ok:false;reason:"too_large"|"read_failed"};
async function readBoundedBody(request:Request):Promise<BoundedBodyResult>{
 const contentLength=request.headers.get("content-length");
 if(contentLength&&/^\\d+$/.test(contentLength)&&Number(contentLength)>MAX_REQUEST_BODY_BYTES)return {ok:false,reason:"too_large"};
 if(!request.body)return {ok:true,body:""};
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;
   if(total>MAX_REQUEST_BODY_BYTES){await reader.cancel().catch(()=>undefined);return {ok:false,reason:"too_large"}}
   chunks.push(value);
  }
  return {ok:true,body:Buffer.concat(chunks,total).toString("utf8")};
 }catch{
  await reader.cancel().catch(()=>undefined);return {ok:false,reason:"read_failed"};
 }finally{reader.releaseLock()}
}
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({error:"invalid_origin"},{status:403});
 const bodyResult=await readBoundedBody(request);
 if(!bodyResult.ok)return NextResponse.json({error:bodyResult.reason==="too_large"?"request_too_large":"invalid_request"},{status:bodyResult.reason==="too_large"?413:400});
 let body:{code?:unknown};try{body=JSON.parse(bodyResult.body) as {code?:unknown}}catch{return NextResponse.json({error:"invalid_request"},{status:400})}
 const code=typeof body.code==="string"?body.code.trim():"";if(!/^\d{6}$/.test(code))return NextResponse.json({error:"invalid_code"},{status:400});
 const supabase=await createClient();const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)return NextResponse.json({error:"not_authenticated"},{status:401});
 const {data:memberships}=await supabase.from("memberships").select("role").eq("user_id",user.id).eq("status","active");if(!memberships?.some(m=>m.role==="owner"))return NextResponse.json({error:"owner_only"},{status:403});
 const {data:claimsData,error:claimsError}=await supabase.auth.getClaims();const sessionId=claimsData?.claims?.session_id;if(claimsError||typeof sessionId!=="string")return NextResponse.json({error:"session_unavailable"},{status:401});
 let admin:ReturnType<typeof createAdminClient>;try{admin=createAdminClient()}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const now=new Date().toISOString();const {data:challenge,error}=await admin.from("email_mfa_challenges").select("id,code_hash,attempt_count,expires_at").eq("user_id",user.id).eq("session_id",sessionId).is("used_at",null).gt("expires_at",now).order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(error||!challenge)return NextResponse.json({error:"challenge_expired"},{status:400});
 if(challenge.attempt_count>=5){await admin.from("email_mfa_challenges").update({used_at:now}).eq("id",challenge.id).is("used_at",null);return NextResponse.json({error:"too_many_attempts"},{status:429})}
 let candidate:string;try{candidate=hashEmailCode(user.id,sessionId,code)}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const expected=Buffer.from(challenge.code_hash),actual=Buffer.from(candidate),valid=expected.length===actual.length&&timingSafeEqual(expected,actual);
 if(!valid){
  // A server-only PostgreSQL RPC increments the counter atomically, including concurrent requests.
  const {data:attemptRows,error:attemptError}=await admin.rpc("record_email_mfa_failed_attempt",{p_challenge_id:challenge.id});
  if(attemptError)return NextResponse.json({error:"challenge_update_failed"},{status:500});
  const attempt=Array.isArray(attemptRows)?attemptRows[0]:null;
  if(!attempt||attempt.outcome==="unavailable")return NextResponse.json({error:"challenge_already_used_or_updated"},{status:409});
  const locked=attempt.outcome==="locked";
  if(attempt.outcome!=="incremented"&&!locked)return NextResponse.json({error:"challenge_update_failed"},{status:500});
  return NextResponse.json({error:locked?"too_many_attempts":"invalid_code"},{status:locked?429:400});
}
 const {data:consumed,error:consumeError}=await admin.from("email_mfa_challenges").update({used_at:now}).eq("id",challenge.id).is("used_at",null).select("id").maybeSingle();if(consumeError||!consumed)return NextResponse.json({error:"challenge_already_used"},{status:409});
 let token:string;try{token=createEmailMfaToken(user.id,sessionId)}catch{return NextResponse.json({error:"email_mfa_not_configured"},{status:503})}
 const store=await cookies();store.set(EMAIL_MFA_COOKIE,token,emailMfaCookieOptions());return NextResponse.json({ok:true});
}
