#!/usr/bin/env node
import process from "node:process";

const target = process.argv[2];
const production = process.argv.includes("--production");
const requiredByTarget = {
  web: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  api: ["SUPABASE_URL", "SUPABASE_JWKS_URL", "CORS_ORIGINS"],
};

if (!Object.hasOwn(requiredByTarget, target)) {
  console.error("Usage: node scripts/preflight.mjs <web|api> [--production]");
  process.exit(2);
}

const required = [...requiredByTarget[target]];
if (production && target === "web") {
  required.push(
    "SUPABASE_SERVICE_ROLE_KEY",
    "APP_MFA_SECRET",
    "GROQ_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "RESEND_WEBHOOK_SECRET",
    "CRON_SECRET",
  );
}

const missing = [];
const placeholders = [];
for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) {
    missing.push(name);
  } else if (/YOUR_PROJECT_REF|REPLACE_ME|CHANGE_ME|PLACEHOLDER|example\.com/i.test(value)) {
    placeholders.push(name);
  }
}

const unsafePublicNames = Object.keys(process.env).filter((name) =>
  /^NEXT_PUBLIC_.*(?:SERVICE_ROLE|APP_MFA_SECRET|GROQ_API_KEY|RESEND|CRON_SECRET|WEBHOOK_SECRET)/i.test(name),
);

if (missing.length || placeholders.length || unsafePublicNames.length) {
  console.error("Crestovia AI configuration preflight failed.");
  if (missing.length) console.error(`Missing required variables: ${missing.join(", ")}`);
  if (placeholders.length) console.error(`Placeholder values detected for: ${placeholders.join(", ")}`);
  if (unsafePublicNames.length) console.error(`Potentially sensitive variables use NEXT_PUBLIC_: ${unsafePublicNames.join(", ")}`);
  console.error("Variable values are intentionally never printed.");
  process.exit(1);
}

console.log(`Crestovia AI ${target} configuration preflight passed${production ? " (production profile)" : ""}.`);
