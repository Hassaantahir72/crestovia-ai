# Daily briefing — v0.2.16

## What it does
The signed-in workspace briefing aggregates visible data into a single page:
- Overdue tasks and tasks due today.
- Tasks due over the next seven days.
- Blocked and in-progress work.
- Active/planned/on-hold projects and their target dates.
- Unexpired approval requests visible to the current user.
- Recent workspace activity visible under row-level security.

## Security model
- Uses the regular authenticated Supabase server client; no service-role key is used for briefing reads.
- Organization scoping is applied to queries and RLS further filters rows by the user's actual permissions.
- The user's saved timezone is used for deadline grouping. Invalid timezones fall back to `Asia/Karachi`.
- The page is a read-only summary. It does not send email, change tasks, approve requests, or call AI tools.

## Current limits
- This is a deterministic summary, not an AI-generated narrative.
- Counts are bounded by query limits (200 open tasks, 100 open projects, 50 pending approval records, and 8 recent activity items).
- It currently uses the first active organization selected by the workspace UI. Multi-organization switching is a separate planned feature.
- Activity depends on workspace activity rows being written by the relevant workflows.

## Next improvements
- Add owner-configurable daily delivery and reminders after notification channels and preferences are implemented.
- Add a per-user organization switcher.
- Add calendar/integration events only after OAuth and integration permissions are implemented.
- Allow AI to summarize the same permission-filtered facts only after the AI provider is configured; any proposed action must go through the approval system.
