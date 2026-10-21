-- READ-ONLY operational audit. Run in the Supabase SQL editor or with a trusted read-only database session.
-- This script does not change schemas, grants, policies, rows, or migration history.

-- 1. Confirm exposed public tables have RLS enabled and inspect policy coverage.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname)::integer as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;

-- 2. Inventory direct table privileges granted to browser-facing roles.
-- Review these alongside RLS policies; a grant is not by itself proof of data exposure.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 3. Inventory SECURITY DEFINER functions exposed in public and their effective execute privileges.
-- Each returned function needs an intentional authorization review; do not revoke blindly.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname, arguments;

-- 4. Review the recorded migration history. Compare it to source files manually before any repair.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 5. Inspect default privileges for public objects and their owner roles.
select
  defaclrole::regrole::text as owner_role,
  defaclobjtype as object_type,
  defaclacl::text as default_acl
from pg_default_acl
where defaclnamespace = 'public'::regnamespace
order by owner_role, object_type;

-- 6. Check effective table-level administrative privileges that RLS does not filter.
select
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'TRUNCATE') as anon_can_truncate,
  has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE') as authenticated_can_truncate,
  has_table_privilege('authenticated', format('public.%I', table_name), 'MAINTAIN') as authenticated_can_maintain
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
