# Team invitation security

Crestovia AI v0.2.53 adds server-side throttling and duplicate-state checks to the owner-only team invitation action.

## Limits

- Up to 5 invitation attempts per minute, 20 per hour, and 50 per day per organization owner account.
- Limits use the shared private Supabase-backed rate-limit helper added in v0.2.52; counters remain consistent across multiple web instances.
- The owner and organization scope are checked before the invitation action. Existing pending invitations and tracked active members are checked before calling Supabase Auth to send email.
- If rate-limit storage is unavailable, the action fails closed and no invitation is sent.

## Required configuration

- Apply migration `0032_user_rate_limits_v0_2_52.sql` to the Supabase project (already applied to the configured Crestovia project as part of v0.2.52).
- Configure `SUPABASE_SERVICE_ROLE_KEY` only as a server-side secret, alongside `NEXT_PUBLIC_SUPABASE_URL`.
- Supabase Auth email delivery must be configured to send invitation messages.

## Notes

- These limits are per owner account, not a global organization-wide quota or an IP-based limit.
- The action checks the existing invitation ledger before sending to avoid repeating a known pending invitation. Authenticated users still cannot read or mutate the private rate-limit counters directly.
- Validate the limits with real onboarding traffic before production rollout. Public deployment remains deferred.
