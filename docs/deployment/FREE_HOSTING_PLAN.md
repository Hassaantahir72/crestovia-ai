# Crestovia AI — Free-first live hosting plan

Version baseline: 0.2.1

## Goals

- Keep the user as the owner of every account, repository, deployment, and database.
- Prefer free tiers and do not enable paid plans or paid add-ons without explicit approval.
- Deploy incrementally, validating each stage before moving to the next.
- Never claim a deployment is live until its public URL and basic health checks have been tested.

## Proposed stack

| Component | Initial target | Purpose | Free-tier caveat |
|---|---|---|---|
| Source control | GitHub repository owned by the user | Full source history and rollback | Private repositories are available on free accounts, subject to GitHub limits |
| Web app | Cloudflare Workers using the supported Next.js adapter path | HTTPS public preview and deploys from source | Free plan has quotas and runtime constraints; verify adapter compatibility before production |
| Database and auth | Existing user-owned Supabase project | PostgreSQL, authentication, RLS | Free plan has quotas and projects can pause after inactivity; maintain backups/exports |
| Python API | Keep local until required; then evaluate a free web-service tier such as Render | API endpoints not handled by Supabase | Free services may sleep, have limited resources, and are not a production SLA |
| AI | Groq free tier if available for the account and current usage | AI chat and tool orchestration | Rate limits and model availability can change; never rely on it as guaranteed unlimited capacity |

**Important hosting decision:** Do not use Vercel Hobby for the company's operational deployment without checking eligibility. Its published terms restrict Hobby use to personal/non-commercial projects. A paid Vercel plan is not part of this free-first plan.

## Ownership and access policy

1. The user creates and owns the GitHub organization/repository, Cloudflare account, and Supabase organization/project.
2. ChatGPT may use connected provider tools only after the user explicitly connects them and grants permissions.
3. Never request passwords, database passwords, Supabase secret/service-role keys, or provider tokens in chat.
4. Add deploy secrets in the provider's environment-variable/secret settings, not in Git.
5. Use only the Supabase publishable key in browser variables. Keep service-role/secret keys server-side and avoid using them unless a specific server-side task requires them.
6. Keep organization RLS policies enabled and test access using two different users/organizations before adding real company data.
7. Keep billing disabled where possible; do not click upgrade, enable paid add-ons, or register a paid domain without user approval.

## Deployment sequence

### Stage A — Verify Supabase (required before deployment)

1. In the user's Supabase dashboard, check whether `0001_foundation.sql` has succeeded.
2. If foundation migration succeeded, apply `0002_company_workspace.sql` once.
3. Run `docs/supabase/VERIFY_FOUNDATION.sql` and `docs/supabase/VERIFY_COMPANY_WORKSPACE.sql`.
4. Confirm required tables exist and RLS is enabled. Do not re-run a migration blindly if some objects already exist; inspect the error and current schema first.
5. Configure Supabase Auth URL settings for local development and the eventual Cloudflare preview hostname. Add the production URL later after deployment returns it.

### Stage B — User-owned GitHub repository

1. Create a private repository named `crestovia-ai` in the user's own GitHub account or organization.
2. Upload/push the complete project root, including `apps/`, `database/`, `docs/`, and `.github/`.
3. Confirm `.env`, `.env.local`, `apps/api/.env`, and credentials are excluded by `.gitignore` before the first push.
4. Keep a tagged/versioned release for each delivered ZIP so deployments can be rolled back.

### Stage C — Deploy the Next.js web app

1. Create/sign into the user's Cloudflare account and open Workers & Pages.
2. Connect the user's GitHub repository using the provider's authorized flow.
3. Use `apps/web` as the application root directory, because the Next.js package lives there.
4. Select the currently supported Next.js-on-Workers deployment path. Cloudflare's current docs recommend vinext for new applications and document OpenNext for existing applications; choose only after a local/preview compatibility build succeeds.
5. Configure only these browser-safe variables in the deployment environment:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
6. Deploy to the free `workers.dev` hostname. Do not add a custom domain because domains can cost money.
7. Test the homepage, sign-in page, auth callback, protected dashboard, onboarding, projects, and tasks. Record any compatibility issues before declaring the deployment successful.

### Stage D — Connect authentication redirect URLs

After Cloudflare supplies the actual preview URL:

1. Open Supabase → Authentication → URL Configuration.
2. Set Site URL to the current deployed URL when appropriate.
3. Add the exact deployed URL and callback path `/auth/callback` to the redirect allow-list.
4. Keep `http://localhost:3000/auth/callback` for local development.
5. Test sign-in, sign-out, expired sessions, and protected-page redirects.

### Stage E — API hosting (only when needed)

The FastAPI service is currently small. Do not add a second hosting provider before it is needed. When API features become necessary, compare a free Python service's current terms, sleep behavior, quotas, and data handling. Configure `SUPABASE_URL` and `SUPABASE_JWKS_URL` as server-side environment variables. If the selected free host cannot meet the requirement, discuss alternatives before choosing a paid option.

## Go-live acceptance checklist

- [ ] User owns GitHub repo and has admin access
- [ ] User owns Supabase project and can access SQL Editor, Auth, logs, and settings
- [ ] Foundation and workspace migrations applied and verified
- [ ] RLS checked with at least two users in separate organizations
- [ ] No secrets in Git history or browser bundles
- [ ] Cloudflare preview builds successfully from GitHub
- [ ] Public HTTPS URL recorded and reachable
- [ ] Auth callback and protected routes tested on deployed hostname
- [ ] Owner can export database data and recover the repository
- [ ] Free-plan limits and inactivity/pause behavior reviewed
- [ ] No paid plan/add-on/custom domain enabled without explicit approval

## Current status

This document is a deployment plan, not proof of hosting. No provider account has been connected by this document, and no public deployment URL exists until a real deployment is completed and verified.
