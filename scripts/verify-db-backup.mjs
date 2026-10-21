import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export async function runPgRestoreList(filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn("pg_restore", ["--list", filePath], {
      stdio: ["ignore", "ignore", "ignore"],
      shell: false,
      windowsHide: true,
    });
    child.once("error", () => reject(new Error("pg_restore could not be started")));
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("pg_restore rejected the backup archive"));
    });
  });
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export async function verifyBackup(filePath, validateArchive = runPgRestoreList) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("A backup file path is required");
  }

  let info;
  try {
    info = await lstat(filePath);
  } catch {
    throw new Error("Backup file is unavailable");
  }

  if (info.isSymbolicLink() || !info.isFile()) {
    throw new Error("Backup path must be a regular file, not a symlink");
  }
  if (info.size === 0) throw new Error("Backup file is empty");

  try {
    await validateArchive(filePath);
  } catch {
    throw new Error("Backup archive validation failed");
  }

  return { sizeBytes: info.size, sha256: await sha256File(filePath) };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || process.argv.length !== 3) {
    process.stderr.write("Usage: node scripts/verify-db-backup.mjs <custom-format-backup-file>\n");
    process.exitCode = 2;
    return;
  }

  try {
    const result = await verifyBackup(filePath);
    process.stdout.write("Backup archive: valid\n");
    process.stdout.write(`Size bytes: ${result.sizeBytes}\n`);
    process.stdout.write(`SHA-256: ${result.sha256}\n`);
    process.stdout.write("Note: archive validation is not a restore drill.\n");
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
