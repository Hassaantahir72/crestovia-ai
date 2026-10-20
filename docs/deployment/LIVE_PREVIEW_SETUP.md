# Crestovia AI — First live preview (free tier)

This guide prepares the first public web preview. It does not claim a deployment exists until Render returns a URL and the URL is tested.

## Why Render for the first preview?

Render documents support for full Next.js applications as Node.js web services. Its free web services sleep after 15 minutes without traffic and can take about a minute to wake. Render explicitly positions free instances for testing/hobby use rather than production applications. We will use it as a zero-cost preview while building, not promise production-grade availability. Do not add a payment method or upgrade just to follow this guide. If a usage limit is reached and no payment method is present, the service may be suspended instead of charged.

## A. Create a private GitHub repository

1. Open https://github.com/new while signed in to the GitHub account you own.
2. Repository name: `crestovia-ai`.
3. Choose **Private**. This keeps source code private while we build.
4. For the easiest first push, check **Add a README file**. Do not add a license or `.gitignore` template because the project already contains those files.
5. Click **Create repository**.
6. Share only the repository URL in chat, not credentials. The connected GitHub integration can then be used where its granted permissions allow.

If GitHub says the name is already taken in your account, stop and check whether that existing repository contains Crestovia AI before changing anything.

## B. Confirm Supabase setup

1. Open your own Supabase project and go to Project Settings → API (the exact menu may vary).
2. Copy the **Project URL** and the **publishable key**. A legacy `anon` key is also browser-safe if your project still uses it. Never use a `service_role` or secret key in a `NEXT_PUBLIC_` variable.
3. Confirm `database/migrations/0001_foundation.sql` has been applied before attempting to sign in. Then apply `0002_company_workspace.sql` once, if it has not already been applied. Do not rerun a migration blindly; inspect the schema and error first.
4. Keep `docs/supabase/VERIFY_FOUNDATION.sql` and `docs/supabase/VERIFY_COMPANY_WORKSPACE.sql` for verification.

## C. Connect Render to the private repository

1. Open https://render.com and sign in/create an account. Use the free plan and do not enable paid add-ons.
2. Choose **New → Blueprint** (or create a Web Service if Blueprint is not available).
3. Connect the private `crestovia-ai` GitHub repository and select its default branch.
4. If using Blueprint, Render reads the root `render.yaml` file and prepares `crestovia-ai-web` with the Free plan. Review every service and plan before applying.
5. In the web service's Environment settings, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` using values from your own Supabase project. These are the only Supabase variables required by the web app at this stage. Do not paste them into chat.
6. Trigger deploy and wait for the build logs to finish.
7. Copy the resulting `https://...onrender.com` URL. That URL is the live preview address.

## D. Configure Supabase Auth for the real URL

Once Render provides the actual hostname:

1. Open Supabase → Authentication → URL Configuration.
2. Add the exact live URL and `https://YOUR-REAL-HOST/auth/callback` to the allowed redirect URLs. Replace `YOUR-REAL-HOST` with the actual Render hostname; do not type the placeholder literally.
3. Keep `http://localhost:3000/auth/callback` for local testing.
4. Test sign-in, sign-out, protected dashboard redirects, and organization onboarding.

## E. Acceptance checks before calling it live

- [ ] Repository is private and owned by the user.
- [ ] `render.yaml` was reviewed and service plan is Free.
- [ ] Supabase project URL and publishable key were configured in Render, not committed to Git.
- [ ] Build logs show a successful deploy.
- [ ] Public HTTPS URL loads.
- [ ] Auth redirect URLs use the real deployed hostname.
- [ ] Sign-in and sign-out work against the real Supabase project.
- [ ] RLS and cross-organization isolation are tested before adding real company data.
- [ ] No paid plan, paid add-on, or paid domain was enabled.

## Known limits

- The current API is not included as a Render service in the first preview because the web app does not yet need its endpoints for the existing screens. Add it when API-backed features require it.
- A free Render web service sleeps after inactivity, and the first request after sleep may be slow. This is acceptable for previewing while building, but not a production uptime guarantee.
- No live deployment or real Supabase database operation is proven by these files alone. Verify each acceptance item after deployment.
