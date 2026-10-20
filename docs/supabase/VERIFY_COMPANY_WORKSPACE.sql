-- Run after database/migrations/0002_company_workspace.sql.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('departments', 'projects', 'tasks', 'task_comments', 'workspace_activity')
order by table_name;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('departments', 'projects', 'tasks', 'task_comments', 'workspace_activity')
order by c.relname;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('departments', 'projects', 'tasks', 'task_comments', 'workspace_activity')
order by tablename, policyname;
