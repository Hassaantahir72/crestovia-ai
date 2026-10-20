# Crestovia AI — Changelog

## 0.2.9 — Owner-enforced authenticator MFA
- Added account-security page to enroll, verify, list, and remove TOTP authenticator factors.
- Added login challenge for owners with a verified factor and server-side AAL2 checks on owner dashboard, project, team, and write-action paths.
- Added frontend lint/build CI and corrected flat-config import/export handling based on GitHub Actions feedback.
- Email-delivered second-factor codes remain a separate custom integration; this version uses authenticator-app TOTP and does not claim to meet the email-code preference yet.

## 0.2.8 — Workspace write flows and owner team controls
- Added owner-only project creation.
- Added task creation with project, priority, optional assignee, and due date.
- Added task status updates, subject to database RLS.
- Added owner-only Team Access screen to review active members and assign/revoke project-level viewer, contributor, and manager access.
- Added owner controls to change existing non-owner organization roles and suspend/reactivate memberships.
- Added a web CI workflow for ESLint and Next.js production builds.

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
- Deferred public deployment until features and security acceptance tests are complete and the owner explicitly approves launch.
- AI API keys will be requested only when provider integration begins and must be configured as secrets, never pasted into chat or committed.

## 0.2.4 and earlier
See the Git history for prior foundation, workspace schema, and free-hosting preparation.

## Update policy
Preserve existing work, add a changelog entry, test available checks, verify database/deployment changes, never commit secrets, and deliver a cumulative ZIP for meaningful updates.
