import "server-only";
import {createHmac,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import type {createClient} from "@/lib/supabase/server";
type SupabaseServerClient=Awaited<ReturnType<typeof createClient>>;
export const EMAIL_MFA_COOKIE="crestovia_owner_email_mfa";
const TTL=8*60*60;
function secret(){const value=process.env.APP_MFA_SECRET;return value&&value.length>=32?value:null}
function signature(payload:string,key:string){return createHmac("sha256",key).update(payload).digest("base64url")}
export function hashEmailCode(userId:string,sessionId:string,code:string){const key=secret();if(!key)throw new Error("EMAIL_MFA_NOT_CONFIGURED");return createHmac("sha256",key).update(userId+":"+sessionId+":"+code).digest("hex")}
export function createEmailMfaToken(userId:string,sessionId:string){const key=secret();if(!key)throw new Error("EMAIL_MFA_NOT_CONFIGURED");const payload=Buffer.from(JSON.stringify({uid:userId,sid:sessionId,exp:Math.floor(Date.now()/1000)+TTL})).toString("base64url");return payload+"."+signature(payload,key)}
export function emailMfaCookieOptions(){return {httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge:TTL}}
export async function hasVerifiedEmailMfa(supabase:SupabaseServerClient,userId:string){
 const key=secret();if(!key)return false;
 const [{data:claimsData,error:claimsError},store]=await Promise.all([supabase.auth.getClaims(),cookies()]);
 if(claimsError||!claimsData?.claims)return false;const sid=claimsData.claims.session_id;if(typeof sid!=="string")return false;
 const token=store.get(EMAIL_MFA_COOKIE)?.value;if(!token)return false;const [payload,receivedSignature,extra]=token.split(".");if(!payload||!receivedSignature||extra)return false;
 const expected=Buffer.from(signature(payload,key)),received=Buffer.from(receivedSignature);if(expected.length!==received.length||!timingSafeEqual(expected,received))return false;
 try{const parsed=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {uid?:string;sid?:string;exp?:number};return parsed.uid===userId&&parsed.sid===sid&&typeof parsed.exp==="number"&&parsed.exp>Math.floor(Date.now()/1000)}catch{return false}
}
export function maskEmail(email:string){const [local,domain]=email.split("@");if(!local||!domain)return "your verified email";return (local.length<=2?local.slice(0,1):local.slice(0,2))+"***@"+domain}
