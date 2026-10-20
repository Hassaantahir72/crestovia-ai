-- Read-only checks for the Crestovia AI Phase 1 migration.
-- Run after database/migrations/0001_foundation.sql succeeds.
select
  to_regclass('public.organizations') as organizations_table,
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.memberships') as memberships_table,
  to_regclass('public.audit_logs') as audit_logs_table,
  to_regprocedure('public.create_organization(text,text)') as create_organization_function;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('organizations', 'profiles', 'memberships', 'audit_logs')
order by tablename;
