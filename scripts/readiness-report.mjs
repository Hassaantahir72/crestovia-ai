#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checklistPath = path.join(root, "docs", "PRODUCTION_READINESS.md");
const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const json = args.has("--json");
const validateOnly = args.has("--validate");

const source = await readFile(checklistPath, "utf8");
const headings = [...source.matchAll(/^## (Gate [A-F] — .+)$/gm)];
const requiredGates = ["A", "B", "C", "D", "E", "F"];
const foundGates = headings.map((match) => match[1].match(/^Gate ([A-F])/)[1]);
const checks = [...source.matchAll(/^- \[([ xX])\] (.+)$/gm)].map((match) => ({
  checked: match[1].toLowerCase() === "x",
  label: match[2].trim(),
  gate: source.slice(0, match.index).match(/^## Gate ([A-F]) —/gm)?.at(-1)?.match(/^## Gate ([A-F])/)[1] ?? null,
}));
const problems = [];
if (JSON.stringify(foundGates) !== JSON.stringify(requiredGates)) problems.push("readiness checklist must contain Gates A through F exactly once and in order");
if (checks.length !== 30) problems.push(`expected 30 checklist items, found ${checks.length}`);
if (checks.some((item) => !item.gate)) problems.push("every checklist item must belong to a readiness gate");
if (!/\*\*Current state:\*\* Not release-ready by assertion\./.test(source)) problems.push("explicit non-ready state statement is missing");
if (!checks.some((item) => item.gate === "F" && /explicitly approves public deployment/i.test(item.label) && !item.checked)) {
  problems.push("public deployment authorization must remain unchecked until the owner approves it");
}

if (problems.length) {
  console.error("Readiness checklist validation failed:");
  for (const problem of problems) console.error("- " + problem);
  process.exit(1);
}
if (validateOnly) {
  console.log("Readiness checklist structure passed (six gates, 30 items, launch authorization remains owner-gated).");
  process.exit(0);
}

const summary = {
  total: checks.length,
  checked: checks.filter((item) => item.checked).length,
  pending: checks.filter((item) => !item.checked).length,
  percent: checks.length ? Math.round((checks.filter((item) => item.checked).length / checks.length) * 100) : 0,
  gates: headings.map((heading) => {
    const gate = heading[1].match(/^Gate ([A-F])/)[1];
    const items = checks.filter((item) => item.gate === gate);
    return { gate, title: heading[1].replace(/^Gate [A-F] — /, ""), total: items.length, checked: items.filter((item) => item.checked).length, pending: items.filter((item) => !item.checked).length };
  }),
  pendingItems: checks.filter((item) => !item.checked).map(({ gate, label }) => ({ gate, label })),
  releaseReady: checks.every((item) => item.checked),
};
if (json) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`Crestovia AI readiness evidence: ${summary.checked}/${summary.total} verified checklist items (${summary.percent}%).`);
  for (const gate of summary.gates) console.log(`Gate ${gate.gate}: ${gate.checked}/${gate.total} verified; ${gate.pending} pending — ${gate.title}`);
  console.log(`Pending items: ${summary.pending}. This report counts documented evidence only; it does not infer success from source code or CI.`);
  console.log("Public deployment remains blocked until all required evidence and explicit owner authorization are recorded.");
}
if (strict && summary.pending > 0) process.exit(2);
