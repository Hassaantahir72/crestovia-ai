# Crestovia AI — Changelog

## 0.2.8 — Workspace write flows and owner team controls
- Added owner-only project creation.
- Added task creation with project, priority, optional assignee, and due date.
- Added task status updates, subject to database RLS.
- Added owner-only Team Access screen to review active members and assign/revoke project-level viewer, contributor, and manager access.
- Added a web CI workflow for ESLint and Next.js production builds; results are pending GitHub Actions.
- Documented the boundary between implemented project assignments and the still-pending trusted invitation workflow.

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
- AI API keys will be requested only when provider integration begins and must be configured as secrets, never pasted into chat or committed.

## 0.2.4 — GitHub source upload and auth configuration fix
- Uploaded the complete source tree to the private GitHub repository.
- Applied foundation and company-workspace migrations; verified RLS enabled on the initial tables.
- Fixed middleware to accept the configured Supabase publishable key, with legacy anon-key fallback.

## 0.2.3 — Supabase schema applied
- Applied the foundation and company-workspace schemas to the connected Supabase project.
- Verified all nine expected tables exist; reviewed Supabase security/performance advisor findings.

## 0.2.2 — First live preview preparation
- Added Render Free Blueprint, Node.js engine range, and beginner deployment guide.
- Removed the localhost API link from the public landing page.

## 0.2.1 — Free-first hosting preparation
- Added hosting plan, secrets policy, and GitHub Actions API test workflow.

## 0.2.0 — Company workspace foundation
- Added departments, projects, tasks, comments, activity tables and organization-scoped RLS.
- Added read-only project and task screens and setup/verification documentation.

## 0.1.x — Phase 1 foundation
- Added Next.js frontend, Supabase Auth helpers, organization onboarding, FastAPI API, migrations, tests, and setup documentation.

## Update policy
Preserve existing work, add a changelog entry, test available checks, verify database/deployment changes, never commit secrets, and deliver a cumulative ZIP for meaningful updates.
