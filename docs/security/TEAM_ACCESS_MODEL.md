# Crestovia AI — Owner and team access model

## Intended behavior
- **Owner:** full access to the owner's company workspace, departments/projects/tasks, team assignments, membership administration, audit logs, and owner-private records.
- **Team member:** no access to owner-private assistant records, personal settings, private memory, private credentials, or owner-only controls.
- **Project viewer:** can read explicitly assigned projects and their tasks/comments.
- **Project contributor:** can read assigned projects and create/update tasks in those projects; may update tasks assigned to or created by them.
- **Project manager:** can manage the project they are explicitly assigned to.
- **Project assignment:** only the organization owner can grant or revoke project assignments through the database policy. Team-management UI still needs to be built.

Organization role labels such as admin or manager do not grant global visibility. Project access must be explicitly assigned. Personal owner data is isolated by owner_id = auth.uid() and is not shared with organization members.

## Database enforcement
- Migration 0003 adds project_memberships and owner_private_items, enables RLS, and replaces broad workspace-read policies with owner-or-assigned-project policies.
- Migration 0004 restricts membership administration and audit-log visibility to the owner.
- Migration 0005 adds app_private.is_org_owner to avoid self-referencing membership RLS recursion. The helper is in a non-exposed schema and returns only a boolean.

## Important limits / next security tasks
- Database policies are a baseline, not a security certification. Test separate owner/member accounts and at least two projects before adding real company data.
- Enforce MFA (AAL2) for owner/admin sensitive actions in the app and API; do not rely only on a frontend MFA screen.
- Implement owner-controlled invitations, project assignment UI, membership revocation, session revocation, rate limits, audit events, and recovery.
- Do not place secrets or service-role keys in owner-private JSON or client-visible settings; use server-side secret storage.
- Owner email must be configured privately in authentication/authorization settings, not hard-coded into public source code.
