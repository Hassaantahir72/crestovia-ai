import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const jsonHeaders={"Cache-Control":"no-store, max-age=0","Pragma":"no-cache"};

async function runReminderSweep(request:Request){
 const startedAt=Date.now();
 try{
 const secret=process.env.CRON_SECRET;
 if(!secret)return NextResponse.json({error:"cron_not_configured"},{status:503,headers:jsonHeaders});
 if(secret.length<32)return NextResponse.json({error:"cron_secret_weak"},{status:503,headers:jsonHeaders});
 if(request.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({error:"unauthorized"},{status:401,headers:jsonHeaders});
 let admin:ReturnType<typeof createAdminClient>;
 try{admin=createAdminClient()}catch{
  console.error("task_reminder_sweep_unavailable",{stage:"admin_client",reason:"service_role_not_configured"});
  return NextResponse.json({error:"service_role_not_configured"},{status:503,headers:jsonHeaders});
 }

 const now=new Date(),nowIso=now.toISOString(),windowEnd=new Date(now.getTime()+24*60*60*1000),day=nowIso.slice(0,10);
 const {data,error}=await admin.rpc("enqueue_due_task_reminders",{
  p_now:nowIso,
  p_window_end:windowEnd.toISOString(),
  p_day:day,
  p_batch_size:500,
 });
 if(error){
  console.error("task_reminder_sweep_failed",{stage:"enqueue_rpc",reason:"database_rpc_error"});
  return NextResponse.json({error:"task_reminder_batch_failed"},{status:500,headers:jsonHeaders});
 }
 const row=Array.isArray(data)?data[0]:null;
 if(!row){
  console.error("task_reminder_sweep_failed",{stage:"enqueue_rpc",reason:"unexpected_rpc_result"});
  return NextResponse.json({error:"task_reminder_batch_failed"},{status:500,headers:jsonHeaders});
 }
 const summary={
  scanned:Number(row.scanned??0),
  overdueScanned:Number(row.overdue_scanned??0),
  dueSoonScanned:Number(row.due_soon_scanned??0),
  queued:Number(row.queued??0),
  durationMs:Date.now()-startedAt,
 };
 console.info("task_reminder_sweep_completed",summary);
 return NextResponse.json({ok:true,...summary},{headers:jsonHeaders});
 }catch{
  console.error("task_reminder_sweep_failed",{stage:"unexpected_exception",reason:"unexpected_runtime_error"});
  return NextResponse.json({error:"task_reminder_sweep_failed"},{status:500,headers:jsonHeaders});
 }
}
export async function GET(request:Request){return runReminderSweep(request)}
export async function POST(request:Request){return runReminderSweep(request)}
