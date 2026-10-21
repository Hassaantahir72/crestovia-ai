# Task reminder scheduler setup

Crestovia AI v0.2.50 includes an authenticated endpoint that creates in-app reminders for assigned, unfinished tasks whose due time is within the next 24 hours or has passed.

## Required private environment variables

Configure these on the deployed web service, never in source control:

- `CRON_SECRET`: a long, random bearer token shared with the scheduler.
- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role key for the existing project. It must remain server-side and must never use a `NEXT_PUBLIC_` prefix.

The endpoint also needs the existing `NEXT_PUBLIC_SUPABASE_URL` value used by the server-side admin client.

## Scheduler request

Schedule a trusted cron provider to call the deployed app once per hour. Use either GET or POST:

```sh
curl --fail --silent --show-error \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR_DEPLOYED_HOST/api/cron/task-reminders"
```

Replace the host with the actual deployment URL. Do not put the secret in the URL, logs, repository, or chat. Store it in the scheduler's secret store and the hosting provider's private environment settings.

## Behavior and safety

- Each run scans at most 500 assigned tasks: up to 250 overdue tasks and up to 250 tasks due in the next 24 hours. Separate queries prevent a backlog of overdue work from consuming the entire upcoming-task scan.
- The overdue scan prioritizes the most recently overdue tasks; the upcoming scan prioritizes the nearest due dates. Each category has a fixed cap, so larger backlogs need monitoring and may require a later pagination/queue design.
- Due-soon and overdue notifications are deduplicated per task and UTC calendar day.
- The response includes total scanned, per-category scanned, and newly queued counts; it does not send email or SMS.
- The endpoint returns 503 when required configuration is missing and 401 when the bearer token is invalid.
- In-app notifications remain visible only to the recipient while they have active membership in that organization.
- The endpoint is not scheduled automatically by this code. Configure the trusted scheduler after deployment and verify a successful request in its execution logs.
