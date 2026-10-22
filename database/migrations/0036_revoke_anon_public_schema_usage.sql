-- Close the hosted Supabase default-ACL gap at the exposed schema boundary.
--
-- Supabase's platform-managed supabase_admin role has default ACLs that this project
-- cannot alter from its postgres connection. Those defaults may grant anon table/function
-- privileges on future objects. PostgreSQL checks schema USAGE before object privileges,
-- so remove anonymous access to public entirely while keeping normal signed-in app access.
--
-- This is intentionally limited to the public schema and the staging acceptance path.
-- Authenticated application queries and service-role server operations retain USAGE.
-- The owner roles retain their inherent schema-owner privileges.

REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
