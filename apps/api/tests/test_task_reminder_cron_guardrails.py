from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ROUTE = ROOT / "apps" / "web" / "app" / "api" / "cron" / "task-reminders" / "route.ts"
MIGRATION = ROOT / "database" / "migrations" / "0035_task_reminder_batch_dedupe_v0_2_94.sql"


def test_task_reminder_cron_requires_server_secret_before_admin_access():
    source = ROUTE.read_text()
    secret_check = source.index("if(!secret)")
    auth_check = source.index('request.headers.get("authorization")')
    admin_client = source.index("admin=createAdminClient()")
    assert secret_check < auth_check < admin_client
    assert "status:503" in source
    assert "status:401" in source
    assert '"Bearer "+secret' in source


def test_task_reminder_sweep_uses_bounded_deduplicated_database_batch():
    source = ROUTE.read_text()
    migration = MIGRATION.read_text().lower()
    assert 'admin.rpc("enqueue_due_task_reminders"' in source
    assert "p_batch_size:500" in source
    assert "p_day:day" in source
    assert '.from("tasks")' not in source
    assert "limit least(greatest(coalesce(p_batch_size, 500), 1), 500)" in " ".join(migration.split())
    assert "not exists" in migration
    assert "on conflict (dedupe_key) do nothing" in migration
    assert "p_now" in source and "p_window_end" in source
    assert "windowEnd=new Date(now.getTime()+24*60*60*1000)" in source


def test_task_reminder_batch_rpc_returns_pii_minimized_operational_metrics():
    source = ROUTE.read_text()
    assert '"Cache-Control":"no-store, max-age=0"' in source
    assert "overdue_scanned" in source
    assert "due_soon_scanned" in source
    assert "durationMs:Date.now()-startedAt" in source
    assert 'console.info("task_reminder_sweep_completed",summary)' in source
    assert 'console.error("task_reminder_sweep_failed",{stage:"enqueue_rpc",reason:"database_rpc_error"})' in source
    assert "task.title" not in source


def test_task_reminder_route_returns_generic_errors_without_provider_details():
    source = ROUTE.read_text()
    assert 'error:"task_reminder_batch_failed"' in source
    assert 'error:"service_role_not_configured"' in source
    assert "createAdminClient()" in source


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
