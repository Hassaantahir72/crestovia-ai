-- Read-only staging security audit. Run only against the approved staging project.
-- Returns one row per finding; zero rows means the listed invariants passed.
with
public_tables as (
  select c.oid, n.nspname, c.relname, c.relrowsecurity, c.relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
table_findings as (
  select
    case when not t.relrowsecurity then 'RLS_DISABLED' else 'TABLE_PRIVILEGE' end as category,
    format('%I.%I', t.nspname, t.relname) as object_name,
    case
      when not t.relrowsecurity then 'Public base table has row-level security disabled'
      else 'Unexpected effective anon privilege on public table'
    end as detail
  from public_tables t
  where not t.relrowsecurity
     or has_table_privilege('anon', t.oid, 'SELECT')
     or has_table_privilege('anon', t.oid, 'INSERT')
     or has_table_privilege('anon', t.oid, 'UPDATE')
     or has_table_privilege('anon', t.oid, 'DELETE')
     or has_table_privilege('anon', t.oid, 'TRUNCATE')
     or has_table_privilege('anon', t.oid, 'REFERENCES')
     or has_table_privilege('anon', t.oid, 'TRIGGER')
     or has_table_privilege('anon', t.oid, 'MAINTAIN')
  union all
  select
    'AUTHENTICATED_ADMIN_PRIVILEGE',
    format('%I.%I', t.nspname, t.relname),
    'Authenticated role has an administrative table privilege'
  from public_tables t
  where has_table_privilege('authenticated', t.oid, 'TRUNCATE')
     or has_table_privilege('authenticated', t.oid, 'REFERENCES')
     or has_table_privilege('authenticated', t.oid, 'TRIGGER')
     or has_table_privilege('authenticated', t.oid, 'MAINTAIN')
),
schema_findings as (
  select
    'ANON_PUBLIC_SCHEMA_USAGE' as category,
    'schema public' as object_name,
    'anon has effective USAGE on the public schema' as detail
  where has_schema_privilege('anon', 'public', 'USAGE')
),
function_findings as (
  select
    'ANON_FUNCTION_EXECUTE' as category,
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as object_name,
    'anon has effective EXECUTE on a public function' as detail
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'EXECUTE')
),
reminder_rpc_findings as (
  select
    'REMINDER_RPC_SECURITY' as category,
    'public.enqueue_due_task_reminders(timestamptz,timestamptz,date,integer)' as object_name,
    case
      when p.oid is null then 'Expected reminder RPC is missing'
      when p.prosecdef then 'Reminder RPC is SECURITY DEFINER; expected SECURITY INVOKER'
      when has_function_privilege('anon', p.oid, 'EXECUTE') then 'anon can execute reminder RPC'
      when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'authenticated can execute reminder RPC'
      when not has_function_privilege('service_role', p.oid, 'EXECUTE') then 'service_role cannot execute reminder RPC'
      else null
    end as detail
  from (select to_regprocedure('public.enqueue_due_task_reminders(timestamptz,timestamptz,date,integer)') as oid) expected
  left join pg_proc p on p.oid = expected.oid
  where p.oid is null
     or p.prosecdef
     or has_function_privilege('anon', p.oid, 'EXECUTE')
     or has_function_privilege('authenticated', p.oid, 'EXECUTE')
     or not has_function_privilege('service_role', p.oid, 'EXECUTE')
)
select category, object_name, detail from table_findings
union all select category, object_name, detail from schema_findings
union all select category, object_name, detail from function_findings
union all select category, object_name, detail from reminder_rpc_findings
order by category, object_name;