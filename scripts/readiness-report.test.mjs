import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const script = fileURLToPath(new URL("./readiness-report.mjs", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });

test("readiness checklist validates six gates and the owner-gated launch item", () => {
  const result = run("--validate");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /six gates, 30 items, launch authorization remains owner-gated/);
});

test("JSON readiness report has consistent totals and gate groups", () => {
  const result = run("--json");
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.total, 30);
  assert.equal(report.checked + report.pending, report.total);
  assert.equal(report.gates.length, 6);
  assert.deepEqual(report.gates.map((gate) => gate.gate), ["A", "B", "C", "D", "E", "F"]);
  assert.equal(report.pendingItems.length, report.pending);
  assert.equal(report.percent, Math.round((report.checked / report.total) * 100));
  assert.equal(report.releaseReady, report.pending === 0);
});

test("strict mode blocks release while readiness evidence is pending", () => {
  const report = JSON.parse(run("--json").stdout);
  const result = run("--strict");
  if (report.pending > 0) {
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stdout, /Public deployment remains blocked/);
  } else {
    assert.equal(result.status, 0, result.stderr);
  }
});
