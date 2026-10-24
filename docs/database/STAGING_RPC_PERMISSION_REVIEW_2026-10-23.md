# Staging RPC Permission Review — 2026-10-23

**Status:** Read-only inspection completed; runtime acceptance remains incomplete.  
**Project:** Supabase staging `xpwrsxmwqptrpwycibub`  
**Production impact:** None. No production SQL was run and no staging rows were inserted, updated, or deleted.

## Evidence captured

A read-only catalog/function inspection on 2026-10-23 recorded these effective function boundaries:

| RPC | Security mode | anon EXECUTE | authenticated EXECUTE | service_role EXECUTE |
|---|---|---:|---:|---:|
| `public.enqueue_due_task_reminders(timestamptz,timestamptz,date,integer)` | SECURITY INVOKER | No | No | Yes |
| `public.execute_approved_task_request(uuid,uuid)` | SECURITY INVOKER | No | Yes | Not relied on by this review |

The reminder RPC is explicitly restricted to `service_role`; neither `anon` nor `authenticated` can execute it.

The approved-task RPC is executable by `authenticated`, so its in-function authorization checks are security-critical. The inspected function body checks that:
- `auth.uid()` is present;
- the approval request matches the supplied organization;
- the caller has active `owner` membership in that organization;
- the request is approved and not expired;
- the action type is `create_task`; and
- execution status is still `pending` before creating the task and marking the request succeeded.

These are code/catalog observations, **not** proof that the complete live request path behaves correctly under real user identities. Staging Security Advisor reported zero findings at the time checked; that does not replace runtime acceptance.

## Required staging acceptance before release

Use dedicated, disposable test accounts and at least two organizations. Do not use production identities or production data as fixtures.

- [ ] An active owner can execute an approved, unexpired `create_task` request within their own organization.
- [ ] A member/non-owner cannot execute the same request.
- [ ] An owner from a different organization cannot execute the request, even if they know the request UUID.
- [ ] A request from another organization cannot be accessed by changing `p_organization_id`.
- [ ] Pending, rejected, expired, wrong-action-type, and already-succeeded requests are rejected without creating a task.
- [ ] Replaying a successful request does not create a duplicate task.
- [ ] A signed-out/anonymous caller cannot execute the RPC.
- [ ] The reminder RPC succeeds only through the intended service-role scheduler path and is idempotent for duplicate scheduler runs.
- [ ] Reminder batching respects its configured maximum (500) and never crosses organization boundaries.

Record test account roles, organization IDs (non-production), request IDs, outcomes, and CI/run links in a separate acceptance record. Avoid storing tokens, keys, or personal data.

## Release decision

**Do not mark RPC acceptance complete based on this review alone.** The staging environment currently lacks the realistic task/approval/notification fixtures needed to demonstrate all positive and negative cases. Create fixtures only through a reviewed, isolated staging test setup; do not seed shared staging or alter production as a shortcut.

This document authorizes no production migration, production SQL, Auth configuration change, deployment, PR merge, or public launch.
