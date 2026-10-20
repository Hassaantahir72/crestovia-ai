# Crestovia AI — Free-first hosting plan

Version baseline: 0.2.4

## Rules

- Keep GitHub, Supabase, and hosting accounts under the user's ownership.
- Use free tiers only; do not enable paid plans, add-ons, or a paid domain without explicit approval.
- Never paste secrets in chat or commit `.env`, `.env.local`, or provider credentials.
- Do not call a deployment live until the public URL and authentication are tested.

## Current stack

| Component | Current choice | Notes |
|---|---|---|
| Source control | Private GitHub repository `Hassaantahir72/crestovia-ai` | Full source tree pushed to `main`; GitHub Actions tests API |
| Web preview | Render Free Node.js service | Blueprint at `render.yaml`; sleeps after inactivity and is for preview/testing |
| Database/auth | Supabase project `crestovia-ai` | Nine expected tables exist; RLS is enabled on each |
| API | FastAPI, currently not deployed | Host only when API-backed features require it |
| AI | Groq provider planned | Verify current free-tier limits before integration |

## Remaining deployment sequence

1. Connect Render Blueprint to the private GitHub repository and review the service plan.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Render environment settings. Never commit them.
3. Deploy and record the actual `onrender.com` URL.
4. Add the actual `/auth/callback` URL to Supabase Auth redirects.
5. Test login/logout, onboarding, protected routes, and organization isolation with separate test users before real data.
6. Keep database export/restore and GitHub rollback procedures documented.

## Current status

GitHub source upload and Supabase schema/RLS activation are verified. Render deployment, frontend build, real-user auth, and cross-organization security tests are pending. No public deployment URL exists yet.
