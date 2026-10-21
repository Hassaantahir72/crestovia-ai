from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ROUTE = ROOT / "apps" / "web" / "app" / "api" / "cron" / "task-reminders" / "route.ts"


def test_task_reminder_cron_requires_server_secret_before_admin_access():
    source = ROUTE.read_text()
    secret_check = source.index("if(!secret)")
    auth_check = source.index('request.headers.get("authorization")')
    admin_client = source.index("admin=createAdminClient()")
    assert secret_check < auth_check < admin_client
    assert "status:503" in source
    assert "status:401" in source
    assert '"Bearer "+secret' in source


def test_task_reminder_sweeps_are_independently_bounded_and_exclude_completed_work():
    source = ROUTE.read_text()
    assert source.count('.not("assigned_to","is",null)') == 2
    assert source.count('.not("due_at","is",null)') == 2
    assert source.count('.not("status","in","(done,cancelled)")') == 2
    assert '.lte("due_at",nowIso).order("due_at",{ascending:false}).limit(250)' in source
    assert '.gt("due_at",nowIso).lte("due_at",windowEnd.toISOString()).order("due_at",{ascending:true}).limit(250)' in source
    assert "const overdueTasks=overdueResult.data??[],dueSoonTasks=dueSoonResult.data??[]" in source
    assert "windowEnd=new Date(now.getTime()+24*60*60*1000)" in source
    assert "overdueScanned:overdueTasks.length,dueSoonScanned:dueSoonTasks.length" in source


def test_task_reminder_notifications_are_deduplicated_and_responses_not_cached():
    source = ROUTE.read_text()
    assert '"Cache-Control":"no-store, max-age=0"' in source
    assert 'dedupe_key:type+":"+task.id+":"+day' in source
    assert '.upsert(rows,{onConflict:"dedupe_key",ignoreDuplicates:true})' in source
    assert "export async function GET(request:Request)" in source
    assert "export async function POST(request:Request)" in source


def test_task_reminder_route_returns_generic_errors_without_provider_details():
    source = ROUTE.read_text()
    assert 'error:"task_query_failed"' in source
    assert 'error:"notification_queue_failed"' in source
    assert 'error:"service_role_not_configured"' in source
    assert "createAdminClient()" in source


def test_task_reminder_sweep_emits_pii_minimized_operational_metrics():
    source = ROUTE.read_text()
    assert 'console.info("task_reminder_sweep_completed",summary)' in source
    assert 'console.error("task_reminder_sweep_failed",{stage:"overdue_query",reason:"database_query_error"})' in source
    assert 'console.error("task_reminder_sweep_failed",{stage:"due_soon_query",reason:"database_query_error"})' in source
    assert 'console.error("task_reminder_sweep_failed",{stage:"notification_upsert",reason:"database_write_error",scanned:tasks.length})' in source
    assert "durationMs:Date.now()-startedAt" in source
    assert "task.title" not in source[source.index("console.info"):source.index("console.info")+100]


def test_task_reminder_sweep_handles_unexpected_runtime_exceptions_safely():
    source = ROUTE.read_text()
    assert 'stage:"unexpected_exception",reason:"unexpected_runtime_error"' in source
    assert 'error:"task_reminder_sweep_failed"' in source
    assert 'return NextResponse.json({error:"task_reminder_sweep_failed"},{status:500,headers:jsonHeaders})' in source


def test_task_reminder_cron_rejects_short_secrets_before_auth_or_admin_access():
    source = ROUTE.read_text()
    secret_check = source.index("if(!secret)")
    strength_check = source.index("if(secret.length<32)")
    auth_check = source.index('request.headers.get("authorization")')
    admin_client = source.index("admin=createAdminClient()")
    assert secret_check < strength_check < auth_check < admin_client
    assert 'error:"cron_secret_weak"' in source
    assert "status:503" in source
