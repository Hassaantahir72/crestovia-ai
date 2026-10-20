-- Make audit history explicitly read-only to browser roles.
-- Trusted server-side writes continue through the service_role client.
revoke all privileges on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;
