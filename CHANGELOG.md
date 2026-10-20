# Crestovia AI — Changelog

## 0.2.6 — Owner privacy and project-scoped team access
- Added owner-private data storage protected by user-id RLS.
- Added explicit project membership with viewer/contributor/manager access levels; only the organization owner can assign access in the database.
- Replaced broad workspace read policies with owner-or-assigned-project access policies.
- Added documentation for owner/team permissions and outstanding security acceptance tests.
- Applied the migration to the connected Supabase project and verified RLS is enabled on all 11 public tables.

## 0.2.5 — Security and release requirements
- Added owner access, MFA, tenant isolation, rate-limit, audit, backup, AI approval, and launch-gate plan.
- Documented that email OTP is not a built-in Supabase MFA second factor; recommended TOTP for true 2FA.
- Deferred public deployment until features and security acceptance tests are complete and the owner explicitly approves launch.
- AI API keys will be requested only when provider integration begins and must be configured as secrets, never pasted into chat or committed.

## 0.2.4 — GitHub source upload and auth configuration fix
- Uploaded the complete source tree to the private GitHub repository Hassaantahir72/crestovia-ai.
- Applied foundation and company-workspace migrations; verified all nine initial public tables have RLS enabled.
- Fixed middleware to accept the configured Supabase publishable key, with legacy anon-key fallback.
