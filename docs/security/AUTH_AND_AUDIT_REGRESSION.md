# Authentication and audit regression contract

This document describes the source-level regression checks added in v0.2.28. These checks protect important invariants but are not a replacement for live end-to-end testing with separate test users.

## Email MFA request
- Reject a supplied Origin that differs from the request URL origin.
- Require an authenticated user with an active owner membership and a verified email address.
- Bind challenge creation to the current Supabase session ID.
- Call the atomic issuance RPC through the server-only admin client.
- Require the configured mail provider and secret values before issuing a challenge.

## Email MFA verification
- Reject a supplied cross-origin request and require an authenticated owner.
- Bind the challenge lookup to the authenticated user and current session ID.
- Require an unused, unexpired challenge and compare code hashes using a timing-safe comparison.
- Count failed attempts through the service-role-only atomic RPC.
- Consume the challenge with a conditional update before setting the MFA cookie; a challenge must not be accepted twice.

## Audit events
- Audit writes stay in a server action module and use the server-only admin client.
- Metadata has a typed primitive-value shape. Call sites must continue to avoid secrets, comment bodies, and long free-text content.
- Audit writes are best-effort and can fail without blocking the primary action. Operational monitoring for failed audit writes remains a future hardening task.

## Required live acceptance tests
1. Use separate owner, admin, member, and guest accounts to verify route permissions.
2. Verify an MFA challenge cannot be requested or redeemed from another user's session.
3. Submit simultaneous invalid MFA codes and confirm every failure increments the counter and the fifth attempt locks the challenge.
4. Verify a challenge is one-use under concurrent correct-code submissions.
5. Confirm browser roles cannot write audit rows and cannot read another organization's audit events.
6. Confirm audit metadata never contains secrets or free-text message/comment content.

Do not use production user data for security acceptance tests. Never commit service-role keys, email provider keys, or MFA signing secrets.
