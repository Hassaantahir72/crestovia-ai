# Deployment smoke check

Crestovia AI provides a dependency-free smoke check for an owner-approved deployment. It verifies the API liveness endpoint, API configuration-readiness endpoint, and optionally the web homepage. It does not mutate data, authenticate as a user, or print response bodies or secrets.

## Run

From the repository root with Node.js 20.9 or later:

```sh
API_BASE_URL="https://your-api-host.example" \
WEB_BASE_URL="https://your-web-host.example" \
node scripts/health-smoke.mjs
```

- `API_BASE_URL` is required and must be an HTTP(S) origin.
- `WEB_BASE_URL` is optional; when supplied, the web homepage is checked too.
- Exit code `0` means all requested endpoints returned 2xx; `1` means an endpoint failed or was non-2xx; `2` means the script configuration is invalid.
- Requests time out after 10 seconds and redirects are rejected to avoid silently following an unexpected destination.
- The script prints only the check name and HTTP status. It intentionally does not print response bodies or exception details.

## Interpretation

A successful `/health` response indicates that the API process is serving HTTP. A successful `/ready` response indicates that minimum Supabase/JWKS/CORS configuration is present; it does not prove provider reachability, valid credentials, correct RLS, or organization isolation. The smoke check is not a substitute for real-account acceptance, provider delivery tests, scheduler verification, or backup restoration.

Do not run against a public environment until the owner has explicitly approved deployment. No deployment is triggered by this script.
