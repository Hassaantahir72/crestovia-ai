# API health and readiness checks

Crestovia AI exposes two unauthenticated probes for hosting-platform checks:

- `GET /health` is a **liveness** probe. A successful response means the API process is serving HTTP; it does not verify credentials or downstream services.
- `GET /ready` is a **configuration-readiness** probe. It returns `200` only when `SUPABASE_URL`, `SUPABASE_JWKS_URL`, and a non-empty `CORS_ORIGINS` setting are present. Otherwise it returns `503` with a generic message and does not disclose configuration values.

Use `/health` to determine whether the process is alive and `/ready` to decide whether it has the minimum configuration to accept authenticated API traffic. The readiness check does not make network calls and does not prove the Supabase project or JWKS endpoint is reachable, that credentials are valid, or that database policies are correct. Those require live acceptance tests.

The existing API authentication guard continues to fail closed with `503` when the Supabase token verifier is not configured. Do not place secret values in health responses or logs.
