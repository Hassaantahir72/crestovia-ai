import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

/** Atomic, server-only rate limit backed by the private Supabase ledger. */
export async function consumeUserRateLimit(userId:string,bucket:string,limit:number,windowSeconds:number):Promise<boolean>{
 let admin:ReturnType<typeof createAdminClient>;
 try{admin=createAdminClient()}catch{throw new Error("RATE_LIMIT_UNAVAILABLE")}
 const {data,error}=await admin.rpc("consume_user_rate_limit",{
  p_user_id:userId,p_bucket:bucket,p_limit:limit,p_window_seconds:windowSeconds
 });
 if(error||typeof data!=="boolean")throw new Error("RATE_LIMIT_UNAVAILABLE");
 return data;
}
