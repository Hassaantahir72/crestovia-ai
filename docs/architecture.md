# Crestovia AI Architecture — Phase 1

## Request path

Browser -> Next.js UI -> Supabase Auth for sign-in/session -> FastAPI for protected application APIs -> PostgreSQL with RLS.

## Security boundaries

- Supabase Auth establishes identity.
- The frontend uses only the public anon/publishable key.
- FastAPI validates bearer access tokens using Supabase's JWKS endpoint.
- Database policies constrain organization membership and visibility.
- Future AI actions must call domain services; never let the model execute arbitrary SQL.
- Sensitive actions require an approval record and audit entry.

## Phase 1 scope

Identity, organization membership, profile, and audit foundation only. Projects, tasks, memory, AI, integrations, and voice are deliberately not implemented in this milestone.

## Growth path

Keep a modular monolith until measured scale or reliability needs justify splitting services. Use migrations, typed API contracts, idempotent events, and a background worker as the platform grows.
