-- READ-ONLY operational audit. Run in the Supabase SQL editor or with a trusted read-only database session.
-- This script does not change schemas, grants, policies, rows, or migration history.

-- 1. Confirm exposed public tables have RLS enabled and inspect policy coverage.
select
  c.relname as table_name,
  c.relkind as relation_kind,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  count(p.policyname)::integer as policy_count,
  count(p.policyname) filter (where p.permissive = 'PERMISSIVE')::integer as permissive_policy_count,
  count(p.policyname) filter (where p.permissive = 'RESTRICTIVE')::integer as restrictive_policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
group by c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

-- 2. Inventory direct table privileges granted to browser-facing roles.
-- Review these alongside RLS policies; a grant is not by itself proof of data exposure.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 3. Inventory public functions and effective EXECUTE privileges for browser-facing roles.
-- Includes SECURITY INVOKER and SECURITY DEFINER functions; review intended RPC grants individually.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- 4. Review the recorded migration history. Compare it to source files manually before any repair.
select version, name
from supabase_migrations.schema_migrations
order by version;

-- 5. Inspect global and public-schema default privileges for their owner roles.
-- Global ACLs (defaclnamespace = 0) also affect objects created in public, so include both scopes.
select
  defaclrole::regrole::text as owner_role,
  case
    when defaclnamespace = 0 then '<global>'
    else defaclnamespace::regnamespace::text
  end as privilege_scope,
  defaclobjtype as object_type,
  defaclacl::text as default_acl
from pg_default_acl
where defaclnamespace = 0
   or defaclnamespace = 'public'::regnamespace
order by owner_role, privilege_scope, object_type;

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


-- 7. Check effective table privileges, including inherited PUBLIC grants.
select
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT') as anon_can_select,
  has_table_privilege('anon', format('public.%I', table_name), 'INSERT') as anon_can_insert,
  has_table_privilege('anon', format('public.%I', table_name), 'UPDATE') as anon_can_update,
  has_table_privilege('anon', format('public.%I', table_name), 'DELETE') as anon_can_delete,
  has_table_privilege('anon', format('public.%I', table_name), 'TRUNCATE') as anon_can_truncate,
  has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') as authenticated_can_select,
  has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT') as authenticated_can_insert,
  has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE') as authenticated_can_update,
  has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE') as authenticated_can_delete,
  has_table_privilege('authenticated', format('public.%I', table_name), 'TRUNCATE') as authenticated_can_truncate,
  has_table_privilege('authenticated', format('public.%I', table_name), 'MAINTAIN') as authenticated_can_maintain
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

-- 8. Check effective sequence privileges, not only direct grants.
select
  c.relname as sequence_name,
  has_sequence_privilege('anon', c.oid, 'USAGE') as anon_can_use,
  has_sequence_privilege('anon', c.oid, 'SELECT') as anon_can_select,
  has_sequence_privilege('anon', c.oid, 'UPDATE') as anon_can_update,
  has_sequence_privilege('authenticated', c.oid, 'USAGE') as authenticated_can_use,
  has_sequence_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
  has_sequence_privilege('authenticated', c.oid, 'UPDATE') as authenticated_can_update
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'S'
order by c.relname;


-- 9. Check effective public-schema USAGE and CREATE privileges inherited by browser roles.
-- CREATE is usually unnecessary for browser-facing roles; review before changing grants.
select
  has_schema_privilege('anon', 'public', 'USAGE') as anon_can_use_schema,
  has_schema_privilege('anon', 'public', 'CREATE') as anon_can_create_in_schema,
  has_schema_privilege('authenticated', 'public', 'USAGE') as authenticated_can_use_schema,
  has_schema_privilege('authenticated', 'public', 'CREATE') as authenticated_can_create_in_schema;

-- 10. List policies and their effective command/role intent for targeted review.
-- This is an inventory, not proof that policy predicates are correct.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
