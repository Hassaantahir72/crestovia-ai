# Crestovia AI — Security and Release Plan

## Owner and team access
- The organization owner controls projects, project assignments, existing member roles/status, and owner-only settings.
- Team members should only see projects explicitly assigned to them and must never see owner-private assistant records, credentials, or personal memory.
- Project roles are viewer, contributor, and manager; organization roles do not replace project-level access rules.
- Owner-private records are isolated by user ID in database row-level security.

## Multi-factor authentication
- TOTP authenticator enrollment, verification, and removal are available in Account security.
- Owner workspace pages and server actions require a verified TOTP factor and an AAL2 session.
- The requested email-delivered second-factor code is not implemented in this release. A secure custom email OTP factor must use a trusted email provider and server-only key, short expiry, hashed one-time codes, rate limits, resend cooldowns, brute-force protection, audit events, and replay prevention. Do not treat the primary email login code as a second factor.
- The owner mailbox itself should have its own MFA enabled.

## Required before release
- Test owner and member access with multiple real test accounts and projects, including denied cross-project and cross-organization requests.
- Verify email invitation, role changes, suspension, session revocation, password reset, and account recovery.
- Enforce MFA in server-side routes/actions and validate AAL2; never rely on a client-only security screen.
- Keep service-role and provider secrets server-side only; never commit them or expose them through NEXT_PUBLIC variables.
- Review security advisor findings, especially the SECURITY DEFINER organization-creation RPC.
- Add rate limiting to sign-in, recovery, invitations, OTP, and AI endpoints.
- Review audit logging, backups/restoration, security headers, CSRF/XSS exposure, redirect allow-lists, dependency health, and AI action approvals.
- Do not deploy publicly until the product is complete, security tests pass, and the owner explicitly approves release.


## Organization bootstrap hardening (0.2.10)
- Organization creation now uses a SECURITY INVOKER function and explicit RLS policies for creator-owned organization insertion and first-owner membership bootstrap.
- Verified pg_proc.prosecdef is false and the Supabase security advisor currently returns no security lints.
- The authenticated first-run flow still requires end-to-end testing with a test account before launch.
