# Configuration Preflight

The preflight checks variable presence and obvious placeholder values without printing values or making network requests. It is a configuration sanity check, not proof that credentials work or that a live deployment is secure.

## Commands

Run from the repository root:

```sh
node scripts/preflight.mjs web
node scripts/preflight.mjs api
node scripts/preflight.mjs web --production
```

Or from `apps/web`:

```sh
npm run preflight
npm run preflight:production
```

The script reads variables already present in the process environment. It does not load `.env.local` or `.env` files itself. Keep real values in local ignored env files or hosting-provider secret settings; never commit them or paste them into chat.

The normal web profile checks the public Supabase URL and publishable key. The API profile checks its Supabase URL, JWKS URL, and CORS origins. The web production profile additionally requires the service-role key, MFA secret, Groq key, Resend API key/from address/webhook secret, and cron secret. If a feature is intentionally not enabled, review this production profile before adopting it as a deployment gate.

The script detects common placeholders and known sensitive variable names prefixed with `NEXT_PUBLIC_`. It does not validate token authenticity, network reachability, database grants, provider billing, DNS, or webhook delivery. Those require live acceptance testing.
