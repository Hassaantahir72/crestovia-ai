# Tenant-isolation acceptance runbook

**Purpose:** provide a repeatable, evidence-based acceptance plan for verifying Crestovia AI organization boundaries before production release.

**Important:** this is a manual/live-environment test plan, not proof that the checks have passed. Run it only in a non-production environment with synthetic records and dedicated test accounts. Do not use real customer data. Never place access tokens, cookies, API keys, or personal data in committed evidence.

## 1. Test fixture

Create two independent organizations, **Org A** and **Org B**, and dedicated users:

| Account | Org A membership | Org B membership | Expected access |
|---|---|---|---|
| A-owner | active owner | none | Full authorized Org A administration |
| A-admin | active admin | none | Org A admin functions allowed by role policy |
| A-member | active member | none | Org A member-level functions only |
| B-owner | none | active owner | Full authorized Org B administration |
| A+B-member | active member | active member | Only the explicitly selected/current organization at a time |
| A-suspended | suspended/revoked | none | No organization resource access or approval execution |

Create distinguishable synthetic projects, tasks, departments, notifications, assistant conversations, approval requests, and audit records in both organizations. Record each fixture's non-sensitive ID in a private test worksheet.

## 2. Required negative and positive cases

For each resource type, test both the UI and direct server/API calls using the relevant account's own session. A hidden UI control is not an authorization check.

| Test | Actor and action | Expected result |
|---|---|---|
| Own-organization read | A-member reads Org A records allowed to members | Allowed by the role policy |
| Cross-organization read | A-member requests Org B record by direct URL/API and guessed fixture ID | Denied or not found; no Org B data returned |
| Cross-organization mutation | A-member attempts update/delete of Org B task/project/department | Denied; Org B record remains unchanged |
| Membership enumeration | A-member requests Org B membership/invitation details | Denied or no foreign records returned |
| Notifications | A-member tries to read or mark another user's/Org B notification as read | Denied; foreign notification unchanged |
| Assistant context | A-member requests Org B conversation or workspace-tool data | Denied; no cross-org content appears in response or model context |
| Approval execution | A-member or suspended user replays an approval ID from Org B | Denied; no task or side effect is created |
| Stale organization context | A+B-member switches A → B → A, then replays requests with stale organization IDs | Every request is authorized against the selected org and current membership; no stale-context leakage |
| Suspended membership | A-suspended calls resource and approval endpoints directly | Denied even if a previously issued session still exists |
| Export paths | Any Org A account attempts an export using Org B IDs or filters | No Org B data is exported |
| Owner/admin boundaries | A-member calls owner/admin-only actions directly | Denied server-side |
| Row-level mutation integrity | After all denied attempts, compare the affected Org B rows and audit trail with baseline | No unauthorized changes or side effects |

Apply each relevant row to projects, tasks, departments, conversations/memories, notifications, approvals, audit records, invitations, memberships, and exports. Record not applicable only with a short explanation.

## 3. Approval and RPC-specific checks

- Verify the approved request's organization, requester, status, and current membership are rechecked atomically at execution time.
- Verify the authenticated browser can execute only the intended authenticated RPCs; sensitive rate-limit, MFA, and delivery-webhook RPCs remain service-role-only.
- Confirm a rejected, expired, already-executed, or cross-organization request cannot be replayed to produce a second side effect.
- Use the read-only SQL in database/operations/live-db-security-audit.sql to capture effective table, sequence, schema, function, and default-ACL privileges before and after any separately authorized non-production migration test.

## 4. Evidence worksheet

For every case, capture in a private test record:

- Test ID and UTC timestamp
- Build commit and environment name
- Synthetic actor role and organization (never credentials)
- Resource type and synthetic fixture ID
- Expected result and actual HTTP/status/UI result
- Whether the target row and side effects remained unchanged
- Pass/fail, defect/issue reference, and tester

Evidence should be reviewed by someone other than the person who configured the test where feasible. Store full SQL output and request/response captures securely; redact cookies, bearer tokens, emails, provider payloads, and other sensitive data before sharing.

## 5. Exit criteria

- Every applicable test passes for both organizations and all listed roles.
- No cross-organization data is returned and no unauthorized mutation or side effect occurs.
- Suspended/revoked access is denied server-side.
- Approval and RPC checks pass, and before/after effective privilege audits are reviewed.
- Failures are fixed and retested; evidence is attached to the release record with a named reviewer.

**Release status:** this runbook does not mark the tenant-isolation gate complete. The gate remains open until real non-production accounts execute these tests and evidence is reviewed. Public deployment remains owner-gated.
