# Crestovia AI — First live preview (free tier)

The private repository is already populated: https://github.com/Hassaantahir72/crestovia-ai. The connected Supabase project is `crestovia-ai`; both migrations have been applied and the nine expected public tables have RLS enabled. This guide covers the remaining Render preview steps.

## 1. Connect Render to GitHub

1. Sign in to https://render.com using your own account.
2. Choose **New → Blueprint**.
3. Connect `Hassaantahir72/crestovia-ai` and select `main`.
4. Review `render.yaml`; it defines a single Next.js web service on the **Free** plan with `apps/web` as its root directory.
5. Do not enable paid services, add-ons, or a paid domain.

## 2. Configure environment variables in Render

In the web service's Environment settings, set these values from your own Supabase dashboard:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not place real keys in Git or chat. The publishable key is intended for browser use; never use a `service_role` or secret key in a `NEXT_PUBLIC_` variable.

## 3. Deploy and configure Supabase Auth

1. Trigger the deploy and wait for the build logs to finish.
2. Record the actual `https://...onrender.com` URL.
3. In Supabase → Authentication → URL Configuration, add the actual URL and its `/auth/callback` path to the allowed redirects. Keep `http://localhost:3000/auth/callback` for local development.
4. Test the homepage, sign-in, sign-out, protected dashboard, onboarding, projects, and tasks.

## Acceptance checks

- [ ] Render build succeeds on the Free plan.
- [ ] Public HTTPS URL loads.
- [ ] Supabase Auth callback uses the actual hostname.
- [ ] Sign-in, sign-out, and onboarding work with a real test user.
- [ ] Cross-organization RLS is tested before real company data is added.
- [ ] No paid plan/add-on/domain was enabled.

Render Free web services sleep after inactivity and are for preview/testing, not production uptime guarantees. The application is not considered live until the URL and auth flow are tested.
