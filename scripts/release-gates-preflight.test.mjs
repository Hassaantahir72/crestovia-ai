import assert from "node:assert/strict";
import testCase from "node:test";
import { inspectReleaseGates, RELEASE_GATES } from "./release-gates-preflight.mjs";

testCase("release preflight covers all six formal gates", async () => {
  assert.deepEqual(RELEASE_GATES.map((gate) => gate.id), ["A", "B", "C", "D", "E", "F"]);
  const report = await inspectReleaseGates();
  assert.equal(report.gates.length, 6);
  assert.equal(report.checklistValid, true);
  assert.equal(report.checklistItems, 30);
  assert.equal(report.ownerApprovalPending, true);
});

testCase("source preflight never claims live acceptance or launch authorization", async () => {
  const report = await inspectReleaseGates();
  assert.equal(report.liveAcceptancePerformed, false);
  assert.equal(report.releaseAuthorized, false);
  assert.ok(report.limitations.some((item) => item.includes("live integration test")));
  assert.ok(report.limitations.some((item) => item.includes("restore drill")));
});

testCase("all six gates declare concrete source artifacts", () => {
  assert.ok(RELEASE_GATES.every((gate) => gate.files.length >= 3));
  assert.ok(RELEASE_GATES.every((gate) => gate.files.every((file) => !file.startsWith("/") && !file.includes(".."))));
});
