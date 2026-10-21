# Database backup and restore runbook

This runbook is an operational gate, not proof that a backup exists or that recovery has been tested. Do not run a restore against production as a test. Keep public deployment deferred until the owner approves launch.

## 1. Confirm provider retention and recovery options

In the Supabase dashboard for the intended project, confirm the plan's current backup/PITR availability, retention window, and restore constraints. Record the project reference, plan, retention period, and who verified it in a private operations record. Do not put credentials, connection strings, or customer data in GitHub.

## 2. Create a custom-format backup

Use a trusted operator workstation and a securely obtained database connection string. Prefer an interactive secret manager or shell environment; do not place a password in command history, commit it, or paste it into chat.

```sh
pg_dump --format=custom --no-owner --no-privileges --file=crestovia-prechange.dump "$DATABASE_URL"
```

The backup can contain sensitive company and user data. Store it encrypted with access restricted to authorized operators. Do not upload real database backups to the source repository or CI artifacts.

## 3. Validate the archive locally

With PostgreSQL client tools installed, run:

```sh
node scripts/verify-db-backup.mjs /secure/path/crestovia-prechange.dump
```

The helper rejects missing, empty, non-regular, and symlink paths; uses `pg_restore --list` to validate the custom-format archive; and prints only file size and SHA-256. Store the checksum beside the private backup record. It does not upload the file or connect to a database.

## 4. Perform an isolated restore drill

1. Create or select a dedicated non-production Supabase project with access limited to the recovery operators.
2. Restore into that isolated project using a reviewed command and the correct target connection string. Double-check the destination before executing any restore command.
3. Confirm the expected tables, row counts, key constraints, RLS enablement, policies, function definitions, and grants. Run security and performance advisors.
4. Run API tests and the two-organization/multi-role acceptance checklist against test accounts only.
5. Record restore start/end times, observed errors, verification results, and any gaps in a private evidence record. Never include credentials or personal data.
6. Remove the temporary restore project or securely retain it according to the approved recovery policy.

## 5. Record evidence

For each drill, record: date/time and timezone; operator; source project reference (not connection URL); backup timestamp; SHA-256; target non-production project reference; restore duration; schema/RLS/grant checks; representative application checks; measured recovery point and recovery time; failures/follow-up owner; and approval.

## Important limitations

- A valid archive listing is not proof that a restore will succeed.
- A backup file and checksum are not a substitute for provider-managed backups or point-in-time recovery.
- Do not drop indexes merely because the performance advisor labels them unused; a quiet or recently created database may not have representative workload statistics.
- No live backup or restore is performed by CI. A real restore drill and retention confirmation remain required release gates.
