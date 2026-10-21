# Approval request rate limits

Crestovia AI v0.2.54 applies the shared private rate limiter to both direct approval requests and proposals created from the assistant.

## Limits

- 3 approval requests per minute, 10 per hour, and 30 per day per signed-in user.
- Both entry points use the same bucket names, so switching between the approvals form and the assistant does not reset the user's allowance.
- Rate checks run after input and ownership validation but before inserting a request. If the limiter is unavailable, the request is rejected and no approval row is created.
- The rate limit does not approve or execute an action. Every request still follows the existing owner-review and execution guardrails.

## Infrastructure

- Reuses the private `consume_user_rate_limit` RPC and `user_rate_limit_buckets` table from migration `0032_user_rate_limits_v0_2_52.sql`.
- No new migration or external key is required. The existing `SUPABASE_SERVICE_ROLE_KEY` must remain a private server-side secret.
- These limits are per user, not a global organization quota or an IP-based limit. Review them against real usage before public release.
