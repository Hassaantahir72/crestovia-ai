# Assistant request rate limits

Crestovia AI v0.2.52 adds an atomic, server-side rate limit for signed-in assistant requests and the owner-only Groq connection test.

## Limits

- Assistant messages: 12 requests per minute and 100 requests per hour per user.
- Owner-only provider connection test: 3 requests per minute and 10 requests per hour per user.
- Requests are checked before conversation history is loaded or a provider request is made. A rejected or unavailable limiter fails closed and does not send the prompt to Groq.
- The counter uses a private Supabase table and an atomic PostgreSQL upsert to remain consistent across multiple web instances. It is not an in-memory per-process counter.

## Required configuration

1. Apply migration `0032_user_rate_limits_v0_2_52.sql` to the configured Supabase project.
2. Configure `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret on the web service. It must never have a `NEXT_PUBLIC_` prefix or be committed.
3. Keep `NEXT_PUBLIC_SUPABASE_URL` configured for server-side admin client initialization.

If the migration or service-role configuration is unavailable, assistant requests and provider tests return a clear error instead of bypassing the limiter. This is intentional fail-closed behavior.

## Operational notes

- The database function is SECURITY INVOKER, uses an empty search path, and is executable only by service_role. The ledger has no browser-role grants.
- The table stores one counter row per user and bucket, avoiding unbounded per-request event rows.
- These limits protect authenticated assistant actions; they do not replace Supabase Auth's own rate limits or a future IP/network-level edge limit for public unauthenticated endpoints.
- Validate the configured limits against real usage before production rollout. No public deployment is performed by this change.
