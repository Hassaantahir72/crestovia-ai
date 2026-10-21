# Crestovia AI — First live preview (free tier)

The private repository is already populated: https://github.com/Hassaantahir72/crestovia-ai. This guide covers the remaining Render preview steps. Creating a service, configuring credentials, or deploying it requires explicit owner approval; this repository change does not perform those actions.

## 1. Connect Render to GitHub

1. Sign in to https://render.com using your own account.
2. Choose **New → Blueprint** only after you approve creating a preview service.
3. Connect `Hassaantahir72/crestovia-ai` and select `main`.
4. Review `render.yaml`; it defines a single Next.js web service on the **Free** plan with `apps/web` as its root directory and `autoDeploy: false`.
5. Keep automatic deploys disabled until the owner explicitly approves a controlled rollout. Do not enable paid services, add-ons, or a paid domain.

## 2. Configure environment variables in Render

Only after service creation is approved, set these values from your own Supabase dashboard in Render's private Environment settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not place real keys in Git or chat. The publishable key is intended for browser use; never use a `service_role` or secret key in a `NEXT_PUBLIC_` variable. Other integrations must be configured privately only when their respective acceptance checks are ready.

## 3. Controlled preview deployment

Do not trigger a deploy until the owner has explicitly approved the preview and the required private configuration and release checks are ready. When authorized:

1. Manually trigger the deploy and wait for the build logs to finish.
2. Record the actual `https://...onrender.com` URL.
3. In Supabase → Authentication → URL Configuration, add the actual URL and its `/auth/callback` path to the allowed redirects. Keep `http://localhost:3000/auth/callback` for local development.
4. Test the homepage, sign-in, sign-out, protected dashboard, onboarding, projects, and tasks.

## Acceptance checks

- [ ] Owner explicitly approves creation and deployment of the preview.
- [ ] Render build succeeds on the Free plan.
- [ ] Public HTTPS URL loads.
- [ ] Supabase Auth callback uses the actual hostname.
- [ ] Sign-in, sign-out, and onboarding work with a real test user.
- [ ] Cross-organization RLS is tested before real company data is added.
- [ ] Automatic deploys remain disabled until separately authorized.
- [ ] No paid plan/add-on/domain was enabled.

Render Free web services sleep after inactivity and are for preview/testing, not production uptime guarantees. The application is not considered live until the URL and auth flow are tested.
