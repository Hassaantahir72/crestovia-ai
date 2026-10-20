# Approval workflow security contract

Crestovia AI currently records approval requests and owner decisions. An approval is a **decision record only**; it must not trigger an email, message, calendar change, export, or other external write.

## Required controls

- A requester may create a request only as their own user, with status initially `pending`, and only while holding an active membership in the same organization.
- Only the organization owner may review a request.
- A review is accepted only for a request in the current organization that is still `pending` and has not expired.
- Decisions are limited to `approved` and `rejected`; the reviewer and review timestamp are recorded.
- Successful creation and review write best-effort server-side audit events. Audit metadata must not contain secrets or long free-text request details.
- Approval status never grants permission to call external services. Future action execution must be a separate allow-listed service with explicit action-specific validation and approval binding.

## Automated regression checks

`apps/api/tests/test_approval_guardrails.py` inspects the approval migration and server action source. API CI runs it with the other pytest tests. These are source-level regression checks, not a substitute for live RLS tests.

## Acceptance tests still required

Use separate real test accounts to confirm:
1. An active member can submit a request for themselves.
2. A user cannot create a request for another user or another organization.
3. A member cannot approve or reject requests by calling the server action directly.
4. An owner cannot review a request from another organization, a non-pending request, or an expired request.
5. Approval/rejection creates the expected audit event, and no external action is run.
6. Browser roles cannot directly update approval records unless allowed by the owner-only RLS policy.

Do not use production user data for these tests. Keep service-role credentials private.
