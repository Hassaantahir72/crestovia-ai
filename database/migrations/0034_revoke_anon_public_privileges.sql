-- Harden public-schema Data API privileges.
-- This migration preserves authenticated SELECT/INSERT/UPDATE/DELETE grants and RLS policies.
-- It removes unauthenticated table access and unnecessary table-level administrative privileges.
-- Apply only after reviewing the live-database audit and expected client access patterns.
--
-- Important PostgreSQL behavior: global default ACLs are additive to schema-specific ACLs.
-- A schema-specific REVOKE cannot cancel a grant inherited from a global default ACL.
-- The global default-privilege statements below affect future objects created by postgres
-- in every schema postgres owns, not only public. Review that scope in the target environment.
--
-- Hosted Supabase compatibility: the postgres role is not a member of supabase_admin on the
-- connected project, so ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin fails with permission
-- denied and rolls back the whole migration. This migration intentionally does not attempt it.
-- Existing public objects are still hardened below. If user-facing public objects are ever
-- created as supabase_admin, their defaults require a separate privileged platform operation;
-- do not treat this migration alone as proof that such future objects are safe.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Global defaults for objects created by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default unless revoked.
-- Keep future RPCs opt-in; required functions must receive explicit grants in their migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM authenticated;

-- Keep schema-specific defaults explicit as a defense-in-depth check and for clarity.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM authenticated;
