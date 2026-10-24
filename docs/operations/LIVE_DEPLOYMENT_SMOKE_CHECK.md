# Live deployment smoke check

The GitHub Actions workflow `.github/workflows/live-smoke.yml` performs read-only GET requests against the public Crestovia AI deployment.

## Checks

- `https://crestovia-ai.onrender.com/` responds with a successful HTTP status.
- `https://crestovia-ai-api.onrender.com/health` returns the expected API liveness payload.
- `https://crestovia-ai-api.onrender.com/ready` returns the expected readiness payload.

The workflow can be started manually and is scheduled every six hours once enabled on the repository's default branch. Commits to `security/production-acl-rollout-plan-v1` also run it to validate the smoke-check implementation and current public endpoints.

## Safety and limits

- The script uses GET requests only; it does not log response bodies, headers, or credentials.
- It does not sign in, create records, send messages, invoke AI actions, or modify either database.
- A passing smoke check proves only that these public endpoints responded as expected at that time. It does not prove login, tenant isolation, Groq functionality, email delivery, reminders, authorization, or database recovery.
- A failed check should be investigated in Render logs and the deployment dashboard before any restart or deploy is attempted.
- The workflow is a monitoring aid, not a release approval. Production migrations and deployments remain owner-gated.
