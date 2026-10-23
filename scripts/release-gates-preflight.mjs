#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const RELEASE_GATES = [
  {
    id: "A",
    title: "Source and production build",
    files: [
      ".github/workflows/validate-web.yml",
      ".github/workflows/validate-api.yml",
      ".github/workflows/package-source.yml",
      "scripts/verify-source-archive.py",
      "scripts/readiness-report.mjs",
    ],
  },
  {
    id: "B",
    title: "Organization and role isolation",
    files: [
      "scripts/tenant-isolation-acceptance.mjs",
      "scripts/tenant-isolation-acceptance.test.mjs",
      "docs/security/TENANT_ISOLATION_ACCEPTANCE.md",
      "database/migrations/0023_approval_execution_org_scope_v0_2_41.sql",
      "scripts/approval-rpc-security.test.mjs",
    ],
  },
  {
    id: "C",
    title: "Company AI and Groq",
    files: [
      "apps/web/lib/ai/provider.ts",
      "apps/web/lib/ai/workspace-tools.ts",
      "scripts/groq-live-smoke.mjs",
      "scripts/groq-live-smoke.test.mjs",
      "scripts/ai-provider-guardrails.test.mjs",
    ],
  },
  {
    id: "D",
    title: "Email and reminders",
    files: [
      "apps/web/app/api/cron/task-reminders/route.ts",
      "apps/web/app/api/webhooks/resend/route.ts",
      "apps/api/tests/test_task_reminder_cron_guardrails.py",
      "apps/api/tests/test_resend_delivery_webhooks.py",
      "apps/api/tests/test_resend_webhook_retry_guardrails.py",
    ],
  },
  {
    id: "E",
    title: "Recovery and operations",
    files: [
      "docs/deployment/BACKUP_RESTORE_RUNBOOK.md",
      "scripts/verify-db-backup.mjs",
      "scripts/verify-db-backup.test.mjs",
      "docs/SECURITY_ROLLOUT_RUNBOOK.md",
    ],
  },
  {
    id: "F",
    title: "Launch authorization",
    files: [
      "docs/PRODUCTION_READINESS.md",
      "apps/web/app/admin/page.tsx",
      "scripts/admin-panel-security.test.mjs",
    ],
  },
];

export async function inspectReleaseGates(projectRoot = root) {
  const results = [];
  for (const gate of RELEASE_GATES) {
    const missing = [];
    for (const relativePath of gate.files) {
      try {
        await access(path.join(projectRoot, relativePath));
      } catch {
        missing.push(relativePath);
      }
    }
    results.push({
      id: gate.id,
      title: gate.title,
      requiredFiles: gate.files.length,
      missing,
      sourceArtifactsPresent: missing.length === 0,
    });
  }

  let checklistValid = false;
  let ownerApprovalPending = false;
  let checklistItems = 0;
  try {
    const source = await readFile(path.join(projectRoot, "docs/PRODUCTION_READINESS.md"), "utf8");
    const gateSource = source.split(/^## Security hardening phase 1/m)[0];
    const headings = [...gateSource.matchAll(/^## Gate ([A-F]) — .+$/gm)].map((match) => match[1]);
    const required = ["A", "B", "C", "D", "E", "F"];
    checklistItems = [...gateSource.matchAll(/^- \[([ xX])\] .+$/gm)].length;
    checklistValid = JSON.stringify(headings) === JSON.stringify(required) && checklistItems === 30;
    ownerApprovalPending = /- \[ \].*explicitly approves public deployment/i.test(gateSource);
  } catch {
    checklistValid = false;
  }

  const sourcePreflightPassed =
    results.every((gate) => gate.sourceArtifactsPresent) &&
    checklistValid &&
    ownerApprovalPending;

  return {
    sourcePreflightPassed,
    liveAcceptancePerformed: false,
    releaseAuthorized: false,
    checklistValid,
    checklistItems,
    ownerApprovalPending,
    gates: results,
    limitations: [
      "This is a source-artifact preflight, not a live integration test.",
      "It does not verify credentials, provider connectivity, tenant isolation in a live database, email delivery, cron scheduling, or a successful restore drill.",
      "Public launch remains blocked until all live acceptance evidence is recorded and the owner explicitly authorizes release.",
    ],
  };
}

async function main() {
  const report = await inspectReleaseGates();
  for (const gate of report.gates) {
    const status = gate.sourceArtifactsPresent ? "PASS" : "FAIL";
    process.stdout.write(status + " Gate " + gate.id + ": " + gate.title +
      " (" + (gate.requiredFiles - gate.missing.length) + "/" + gate.requiredFiles + " source artifacts)\n");
    for (const file of gate.missing) process.stdout.write("  MISSING " + file + "\n");
  }
  process.stdout.write("Checklist structure: " + (report.checklistValid ? "valid" : "invalid") +
    " (" + report.checklistItems + " items)\n");
  process.stdout.write("Owner launch approval pending: " + report.ownerApprovalPending + "\n");
  process.stdout.write("Live acceptance performed: false (requires separate environment evidence)\n");
  process.stdout.write("Source preflight: " + (report.sourcePreflightPassed ? "passed" : "failed") + "\n");
  if (!report.sourcePreflightPassed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
