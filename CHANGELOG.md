# Crestovia AI — Changelog

## 0.2.7 — Owner-only team administration hardening
- Restricted membership management and audit-log visibility to the organization owner.
- Added a non-exposed app_private.is_org_owner helper to avoid recursive membership RLS policies.
- Applied and verified the policy correction in Supabase; full real-user owner/member testing remains pending.

## 0.2.6 — Owner privacy and project-scoped team access
- Added owner-private data storage protected by user-id RLS.
- Added explicit project membership with viewer/contributor/manager access levels; only the organization owner can assign access in the database.
- Replaced broad workspace read policies with owner-or-assigned-project access policies.

## 0.2.5 — Security and release requirements
- Added owner access, MFA, tenant isolation, rate-limit, audit, backup, AI approval, and launch-gate plan.
- Documented that email OTP is not a built-in Supabase MFA second factor; recommended TOTP for true 2FA.
- Deferred public deployment until features and security acceptance tests are complete and the owner explicitly approves launch.

## 0.2.4 — GitHub source upload and auth configuration fix
- Uploaded the complete source tree to the private GitHub repository.
- Applied foundation and company-workspace migrations; verified RLS enabled on the initial tables.
- Fixed middleware to accept the configured Supabase publishable key with legacy anon-key fallback.
