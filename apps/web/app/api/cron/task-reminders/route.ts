import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const jsonHeaders={"Cache-Control":"no-store, max-age=0","Pragma":"no-cache"};
const TASK_FIELDS="id,organization_id,title,assigned_to,due_at,status";

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
 const overdueResult=await admin.from("tasks").select(TASK_FIELDS)
  .not("assigned_to","is",null).not("due_at","is",null).not("status","in","(done,cancelled)")
  .lte("due_at",nowIso).order("due_at",{ascending:false}).limit(250);
 if(overdueResult.error){
  console.error("task_reminder_sweep_failed",{stage:"overdue_query",reason:"database_query_error"});
  return NextResponse.json({error:"task_query_failed"},{status:500,headers:jsonHeaders});
 }

 const dueSoonResult=await admin.from("tasks").select(TASK_FIELDS)
  .not("assigned_to","is",null).not("due_at","is",null).not("status","in","(done,cancelled)")
  .gt("due_at",nowIso).lte("due_at",windowEnd.toISOString()).order("due_at",{ascending:true}).limit(250);
 if(dueSoonResult.error){
  console.error("task_reminder_sweep_failed",{stage:"due_soon_query",reason:"database_query_error"});
  return NextResponse.json({error:"task_query_failed"},{status:500,headers:jsonHeaders});
 }

 const overdueTasks=overdueResult.data??[],dueSoonTasks=dueSoonResult.data??[],tasks=[...overdueTasks,...dueSoonTasks];
 const rows=tasks.flatMap(task=>{
  if(!task.assigned_to||!task.due_at)return [];
  const overdue=new Date(task.due_at).getTime()<=now.getTime();
  const type=overdue?"task_overdue":"task_due_soon";
  return [{organization_id:task.organization_id,recipient_id:task.assigned_to,created_by:null,type,title:overdue?"Task overdue":"Task due within 24 hours",body:task.title,entity_type:"task",entity_id:task.id,dedupe_key:type+":"+task.id+":"+day}];
 });
 const summary={scanned:tasks.length,overdueScanned:overdueTasks.length,dueSoonScanned:dueSoonTasks.length,queued:0,durationMs:Date.now()-startedAt};
 if(!rows.length){
  console.info("task_reminder_sweep_completed",summary);
  return NextResponse.json({ok:true,...summary},{headers:jsonHeaders});
 }
 const {data:inserted,error:insertError}=await admin.from("notifications").upsert(rows,{onConflict:"dedupe_key",ignoreDuplicates:true}).select("id");
 if(insertError){
  console.error("task_reminder_sweep_failed",{stage:"notification_upsert",reason:"database_write_error",scanned:tasks.length});
  return NextResponse.json({error:"notification_queue_failed"},{status:500,headers:jsonHeaders});
 }
 summary.queued=inserted?.length??0;
 summary.durationMs=Date.now()-startedAt;
 console.info("task_reminder_sweep_completed",summary);
 return NextResponse.json({ok:true,...summary},{headers:jsonHeaders});
 }catch{
  console.error("task_reminder_sweep_failed",{stage:"unexpected_exception",reason:"unexpected_runtime_error"});
  return NextResponse.json({error:"task_reminder_sweep_failed"},{status:500,headers:jsonHeaders});
 }
}
export async function GET(request:Request){return runReminderSweep(request)}
export async function POST(request:Request){return runReminderSweep(request)}
