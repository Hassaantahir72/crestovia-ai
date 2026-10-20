# Crestovia AI — Security and Release Plan

## Owner and team access
- The organization owner controls projects, project assignments, existing member roles/status, and owner-only settings.
- Team members should only see projects explicitly assigned to them and must never see owner-private assistant records, credentials, or personal memory.
- Project roles are viewer, contributor, and manager; organization roles do not replace project-level access rules.
- Owner-private records are isolated by user ID in database row-level security.

## Multi-factor authentication
- TOTP authenticator enrollment, verification, and removal are available in Account security.
- Owner workspace pages and server actions require a verified TOTP factor and an AAL2 session.
- At milestone 0.2.9 the email code was not implemented; it is now implemented in code as of 0.2.14, but provider configuration and real-account tests remain required. A secure custom email OTP factor must use a trusted email provider and server-only key, short expiry, hashed one-time codes, rate limits, resend cooldowns, brute-force protection, audit events, and replay prevention. Do not treat the primary email login code as a second factor.
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


## Assistant data privacy
- Assistant conversations, messages, and saved memories are user-owned and protected by RLS; team members cannot read one another's assistant data.
- The Groq provider adapter only receives the recent conversation history for the current user's conversation. It has no tools or external-action capability in this version.
- Configure GROQ_API_KEY only as a server-side secret. Never place it in a NEXT_PUBLIC variable or commit a real key.


## Email-code second-factor implementation (0.2.14)
- Email codes are random, hashed with a server-only secret, expire after 10 minutes, and are invalidated after use. Requests have a 60-second resend cooldown and a per-user hourly limit; each code permits at most five attempts. Failed verification increments now use a compare-and-set update to prevent concurrent requests from overwriting one another's attempt count.
- Verification creates a signed HttpOnly cookie bound to the authenticated Supabase session, and the owner gate accepts it or a verified TOTP/AAL2 session.
- Required private settings: SUPABASE_SERVICE_ROLE_KEY, APP_MFA_SECRET (at least 32 characters), RESEND_API_KEY, and RESEND_FROM_EMAIL from a verified sender. Configure only in server secret settings.
- Before launch, test email delivery, expiry, replay rejection, resend limits, wrong-code lockout, session binding, sign-out/session rotation, and TOTP fallback with real test accounts.
