# Monitoring and incident response runbook

This runbook describes what operators should monitor once Crestovia AI is deployed with owner approval. It does not create monitors, send alerts, rotate credentials, or authorize deployment.

## Signals to monitor

Configure checks in the selected hosting/provider dashboards and send alerts to a private, owner-controlled destination.

| Signal | Suggested alert condition | First response |
|---|---|---|
| API liveness `/health` | Repeated failures over 3 consecutive checks | Inspect hosting status and recent deployment logs |
| API readiness `/ready` | Any sustained 503 or repeated failures | Check private configuration names and deployment changes; never copy secret values into tickets |
| Web homepage | Repeated non-2xx responses or timeouts | Inspect web build/deploy status and server logs |
| Reminder scheduler | Missed expected run or repeated non-2xx responses | Check scheduler history, cron configuration, and API logs |
| Email delivery | Repeated bounces, complaints, webhook failures, or stuck pending deliveries | Review provider event status and sender-domain health |
| AI provider | Repeated timeout, rate-limit, or provider errors | Check provider status/limits and application error categories |
| Database | Availability, connection saturation, failed migrations, or unexpected error spikes | Review Supabase status, database metrics, and recent schema changes |
| Authentication/security | Repeated MFA failures, suspicious access patterns, or unexpected membership changes | Review audit records and follow the credential/session response steps below |

Tune thresholds to expected traffic and avoid paging on a single transient failure. Keep monitoring destinations private and access-controlled.

## Incident severity and response

1. **Contain:** identify the affected component and stop risky automation if it may repeat harmful behavior. Do not run destructive database commands as an initial response.
2. **Preserve evidence:** record UTC time, affected service, deployment commit, request/correlation identifiers, and sanitized error category. Do not record passwords, tokens, authorization headers, MFA codes, message bodies, or database connection strings.
3. **Assess scope:** check whether the incident affects one account, one organization, all users, email delivery, reminders, or database availability. Use audit history and provider logs with least-privilege access.
4. **Mitigate:** roll back to the last known-good application commit when appropriate. Treat database migrations separately; do not blindly roll back schema changes or restore over production.
5. **Recover:** verify `/health`, `/ready`, the web homepage, authentication, organization-scoped reads, and the affected workflow using designated test accounts.
6. **Close out:** document cause, impact, timeline, mitigation, and follow-up owner in a private incident record. Remove temporary access when finished.

## Credential compromise

- Use the relevant provider dashboard or approved secret manager to rotate the compromised credential. Never send the old or new value through chat, issue comments, logs, or source control.
- Update the secret in the private hosting configuration and redeploy only through the approved release process.
- For suspected user-session compromise, use the supported Supabase Auth session-revocation process and require reauthentication; verify owner MFA remains enabled.
- Rotate related credentials when exposure scope is uncertain, including webhook and scheduler secrets. Update provider webhook/scheduler configuration together with the application secret to avoid accidental outages.
- Review recent audit events, provider activity, membership changes, and access logs. Preserve relevant evidence before deleting or changing records.
- Confirm the old credential no longer works where the provider supports safe verification. Do not print credentials during verification.

## Recovery and escalation

- If database integrity or availability is in doubt, follow `docs/deployment/BACKUP_RESTORE_RUNBOOK.md`. Restore only into an isolated non-production target during a drill; production recovery requires a separately reviewed plan and explicit authorization.
- If tenant isolation may have failed, restrict access or pause the affected service, preserve evidence, and run the two-organization acceptance checklist before reopening access.
- Escalate unresolved provider incidents to the owner and the provider's official support/status channel. Keep customer or company data out of public tickets.

## Operational acceptance record

Before launch, record privately: monitor owner, alert destination, test notification result, thresholds, on-call/escalation contact, last credential-rotation drill, last successful restore drill, and the last-known-good application commit.

**Limit:** this document is a runbook only. Real alerts, credentials, provider integrations, incident contacts, and recovery drills must be configured and tested in owner-controlled accounts.
