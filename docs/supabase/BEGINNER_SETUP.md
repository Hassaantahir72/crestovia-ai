# Supabase setup for Crestovia AI (beginner guide)

This guide configures the existing Phase 1 project. It does not create a new schema; use the migration already in `database/migrations/0001_foundation.sql`.

## Before you start

- Your Supabase project has finished provisioning.
- Keep the database password in a password manager. Crestovia AI does not need that password in its frontend environment.
- Do not paste any passwords, API keys, access tokens, or screenshots showing full secrets into chat.

## 1. Apply the existing migration

1. Open https://supabase.com/dashboard and select your `crestovia-ai` project.
2. Open **SQL Editor** in the left navigation.
3. Choose **New query**.
4. On your computer, open `database/migrations/0001_foundation.sql` from this ZIP using a text editor.
5. Select and copy the entire file, then paste it into the Supabase SQL Editor.
6. Read the first comments, confirm the project selected is the intended new Crestovia AI project, and click **Run**.
7. Wait for the query to finish. On a brand-new project, the expected result is successful execution. If it fails, do not keep rerunning random parts: copy the error message only (remove any secrets) and ask for help.

Run this migration only once on the new project. It creates the initial tables, row-level security (RLS) policies, and the `create_organization` function. The table schema is not designed as a general-purpose re-runnable migration because policy names already exist after the first successful run.

## 2. Verify that the schema exists

In SQL Editor, open a **new query** and run:

```sql
select
  to_regclass('public.organizations') as organizations_table,
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.memberships') as memberships_table,
  to_regclass('public.audit_logs') as audit_logs_table,
  to_regprocedure('public.create_organization(text,text)') as create_organization_function;
```

All five result columns should contain a non-null object name. Then run:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('organizations', 'profiles', 'memberships', 'audit_logs')
order by tablename;
```

Each of the four tables should show `rowsecurity = true`. These checks confirm schema objects and RLS activation; they do **not** replace testing access with separate users.

## 3. Copy the browser-safe project values

1. In the project dashboard, open **Connect** or **Settings → API Keys** (labels may vary).
2. Copy the **Project URL**.
3. Copy the **publishable key**, normally beginning `sb_publishable_`. It is designed for browser applications and relies on RLS for data access.
4. In the extracted project, copy `apps/web/.env.local.example` to `apps/web/.env.local`.
5. Set `NEXT_PUBLIC_SUPABASE_URL` to your Project URL and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the publishable key.

Never use a `sb_secret_...` key, `service_role` key, database password, or other elevated credential in a `NEXT_PUBLIC_` variable. Never commit `.env.local` to Git. The application keeps a fallback for legacy `anon` keys, but prefer the publishable key for a new setup.

## 4. Configure Auth redirects

In Supabase Dashboard, open **Authentication → URL Configuration** (the exact menu label may vary):

- Site URL for local development: `http://localhost:3000`
- Add Redirect URL: `http://localhost:3000/auth/callback`

If you later deploy the application, add its real HTTPS callback URL separately. Do not remove local URLs while local development is still needed.

## 5. Configure the API's non-secret settings

Copy `apps/api/.env.example` to `apps/api/.env`. Set `SUPABASE_URL` to the same Project URL and `SUPABASE_JWKS_URL` to:

`https://YOUR_PROJECT_REF.supabase.co/auth/v1/.well-known/jwks.json`

Replace `YOUR_PROJECT_REF` with the reference in your actual project URL. The current API validates signed-in user access tokens through the project's JWKS endpoint and does not need a Supabase secret key for the included endpoints.

## 6. Next verification step

After the migration succeeds and local environment files are configured, start the web app and API using the commands in the root `README.md`. Test sign-in, sign-out, and organization creation with a test account. Do not enter real employee or customer data until authentication and organization isolation have been tested.

## Official references

- Supabase database overview and SQL Editor: https://supabase.com/docs/guides/database/overview
- Supabase API keys and safe usage: https://supabase.com/docs/guides/getting-started/api-keys
