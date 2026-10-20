# Crestovia AI — Changelog

## 0.2.16 — Daily briefing foundation
- Added a workspace-aware daily briefing for overdue tasks, due-today and upcoming deadlines, blocked/in-progress tasks, projects, pending approval requests, and recent activity.
- Kept briefing reads on the authenticated Supabase client so row-level security scopes results to each user.
- Added timezone-aware date grouping with a safe fallback and dashboard navigation.
- The briefing is read-only and deterministic; it requires no AI key and cannot execute actions.

## 0.2.15 — Owner approval queue foundation
- Added an RLS-protected action approval request queue for team members to request owner review.
- Added owner approve/reject decisions with optional review notes and expiry metadata.
- Added a dashboard approvals page. Approval decisions are records only; no external actions execute from this queue yet.

## 0.2.14 — Email-code owner MFA
- Added a custom email second-factor challenge for the verified owner email, with 6-digit codes, 10-minute expiry, one-minute resend cooldown, five-attempt hourly limit, keyed code hashes, one-time consumption, and session-bound HttpOnly signed cookies.
- Added server-only challenge storage with RLS and explicit deny policies for browser roles.
- Added Resend email delivery adapter and private environment placeholders. Email delivery is not active until the owner configures the service-role key, APP_MFA_SECRET, Resend API key, and verified sender address in provider secrets.
- Authenticator-app TOTP remains a fallback. The email provider setup and real-account tests are still required.

## 0.2.13 — Invitation acceptance flow
- Added owner invitation initiation through Supabase Auth using a server-only admin client.
- Added invited-membership acceptance on onboarding and a narrow RLS policy allowing invitees to read the organization name for their pending invitation.
- Added an audit event for invitation acceptance and kept invited members blocked from project access until their membership becomes active.
- Invite delivery requires the private service-role key and Supabase Auth email settings; end-to-end email delivery remains unverified.

## 0.2.11 — Private assistant chat and memory foundation
- Added private per-user assistant conversations and messages with RLS isolation.
- Added private memory CRUD screens, also isolated by user ID.
- Added a server-side Groq provider adapter and assistant chat UI; a private GROQ_API_KEY is required before replies work.
- Applied migration 0007 to Supabase and verified RLS is enabled on all three assistant tables.
- No tools or external actions are enabled in the AI chat yet.

## 0.2.10 — RLS-enforced organization bootstrap
- Replaced the SECURITY DEFINER organization-creation RPC with a SECURITY INVOKER function and explicit RLS-constrained first-owner policies.
- Verified the function is no longer SECURITY DEFINER and the Supabase security advisor reports no current security lints.
- Authenticated onboarding test remains pending.

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
