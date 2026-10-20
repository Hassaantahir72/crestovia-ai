# Crestovia AI — Team and workspace flows

## Implemented in 0.2.8
- Owner-only project creation form.
- Task creation with project, priority, optional assignee, and due date.
- Task status updates.
- Owner-only team access page listing active organization membership IDs and roles.
- Owner can assign an existing active organization member to a project as viewer, contributor, or manager, and revoke that project assignment.
- UI reads and writes through the authenticated Supabase server client; database RLS remains the authorization boundary.

## Current constraints
- The team page intentionally does not fetch private authentication user emails or use a service-role key.
- Inviting a new person is not yet enabled. The next step is a trusted server-side invitation workflow using a provider-supported invitation API and a server-only secret. Never place service-role keys in browser-visible environment variables or the client bundle.
- Organization role changes, suspension, and session revocation remain future workflows.
- These flows need real-account tests with an owner, an unassigned member, and a member assigned to only one of two projects before production use.

## Permission expectations
- The owner can create projects and administer assignments.
- A viewer can read only assigned project data; they cannot create tasks unless a separate policy explicitly grants it.
- A contributor can work on tasks only within assigned projects.
- A manager can manage the project they are assigned to, subject to database policies.
- Owner-private records are stored separately and protected by owner_id = auth.uid().
