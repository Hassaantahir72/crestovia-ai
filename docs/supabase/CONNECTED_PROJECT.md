# Connected Supabase project

**Project:** `crestovia-ai`  
**Project reference:** `nnzxslnkpjlfbjmrvxaw`  
**Region:** `ap-southeast-1` (Singapore)  
**Status checked:** 2026-10-20  

## What was applied

The Supabase integration was used to apply the Crestovia foundation schema and company-workspace schema to the connected project. A live SQL check confirmed all nine expected public tables exist: `organizations`, `profiles`, `memberships`, `audit_logs`, `departments`, `projects`, `tasks`, `task_comments`, and `workspace_activity`. The organization bootstrap function is also configured to be callable by authenticated users, not anonymous users.

## Important limits

- This confirms the tables exist; it does **not** confirm the sign-in flow, organization onboarding, or cross-tenant isolation with real test users.
- Supabase's security advisor reports a warning for the `SECURITY DEFINER` organization bootstrap function because authenticated users can call it. That function is intentionally exposed for first-organization onboarding and validates the authenticated user, organization name, and slug. Review this warning before production.
- The web app has not yet been deployed, and its Supabase Auth redirect URLs still need to be configured for the eventual preview URL.
- Never commit a service-role key or paste secrets into chat. Only the browser-safe publishable key belongs in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
