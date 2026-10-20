import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const jsonHeaders={"Cache-Control":"no-store, max-age=0","Pragma":"no-cache"};

async function runReminderSweep(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret)return NextResponse.json({error:"cron_not_configured"},{status:503,headers:jsonHeaders});
 if(request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"unauthorized"},{status:401,headers:jsonHeaders});
 let admin:ReturnType<typeof createAdminClient>;
 try{admin=createAdminClient()}catch{return NextResponse.json({error:"service_role_not_configured"},{status:503,headers:jsonHeaders})}
 const now=new Date(),windowEnd=new Date(now.getTime()+24*60*60*1000),day=now.toISOString().slice(0,10);
 const {data:tasks,error}=await admin.from("tasks").select("id,organization_id,title,assigned_to,due_at,status").not("assigned_to","is",null).not("due_at","is",null).not("status","in","(done,cancelled)").lte("due_at",windowEnd.toISOString()).order("due_at",{ascending:true}).limit(500);
 if(error)return NextResponse.json({error:"task_query_failed"},{status:500,headers:jsonHeaders});
 const rows=(tasks??[]).flatMap(task=>{
  if(!task.assigned_to||!task.due_at)return [];
  const dueAt=new Date(task.due_at),overdue=dueAt.getTime()<=now.getTime();
  const type=overdue?"task_overdue":"task_due_soon";
  return [{organization_id:task.organization_id,recipient_id:task.assigned_to,created_by:null,type,title:overdue?"Task overdue":"Task due within 24 hours",body:task.title,entity_type:"task",entity_id:task.id,dedupe_key:type+":"+task.id+":"+day}];
 });
 if(!rows.length)return NextResponse.json({ok:true,scanned:tasks?.length??0,queued:0},{headers:jsonHeaders});
 const {data:inserted,error:insertError}=await admin.from("notifications").upsert(rows,{onConflict:"dedupe_key",ignoreDuplicates:true}).select("id");
 if(insertError)return NextResponse.json({error:"notification_queue_failed"},{status:500,headers:jsonHeaders});
 return NextResponse.json({ok:true,scanned:tasks?.length??0,queued:inserted?.length??0},{headers:jsonHeaders});
}
export async function GET(request:Request){return runReminderSweep(request)}
export async function POST(request:Request){return runReminderSweep(request)}
