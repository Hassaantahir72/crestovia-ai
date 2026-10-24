import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { verifyBackup } from "./verify-db-backup.mjs";

test("validates an archive and returns size plus SHA-256 without printing the path", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "crestovia-backup-test-"));
  try {
    const file = path.join(dir, "database.dump");
    const bytes = Buffer.from("synthetic archive fixture");
    await writeFile(file, bytes);
    let receivedPath;
    const result = await verifyBackup(file, async (value) => { receivedPath = value; });
    assert.equal(receivedPath, file);
    assert.equal(result.sizeBytes, bytes.length);
    assert.equal(result.sha256, createHash("sha256").update(bytes).digest("hex"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects a missing backup", async () => {
  await assert.rejects(verifyBackup("/no/such/crestovia-backup.dump", async () => {}), /unavailable/);
});

test("rejects empty backup files before archive validation", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "crestovia-backup-test-"));
  try {
    const file = path.join(dir, "empty.dump");
    await writeFile(file, "");
    await assert.rejects(verifyBackup(file, async () => assert.fail("must not validate empty files")), /empty/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects symlink paths", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "crestovia-backup-test-"));
  try {
    const file = path.join(dir, "backup.dump");
    const link = path.join(dir, "link.dump");
    await writeFile(file, "fixture");
    try {
      await symlink(file, link);
    } catch (error) {
      // Windows may deny symlink creation unless Developer Mode or elevated privileges
      // are enabled. Skip only this platform capability test; never skip verifier checks.
      if (["EPERM", "EACCES", "ENOSYS", "EINVAL"].includes(error?.code)) {
        t.skip("This environment does not permit creating symbolic links");
        return;
      }
      throw error;
    }
    await assert.rejects(verifyBackup(link, async () => {}), /symlink/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("does not reveal validator errors or backup paths on invalid archives", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "crestovia-backup-test-"));
  try {
    const file = path.join(dir, "private-customer-backup.dump");
    await writeFile(file, "fixture");
    await assert.rejects(verifyBackup(file, async () => { throw new Error(`secret details: ${file}`); }), /archive validation failed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects blank file paths", async () => {
  await assert.rejects(verifyBackup("   "), /path is required/);
});
