import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../database/migrations/0023_approval_execution_org_scope_v0_2_41.sql", import.meta.url),
  "utf8",
);

test("approval execution is bound to the requested organization and locks the row", () => {
  assert.match(migration, /where r\.id = p_request_id\s+and r\.organization_id = p_organization_id\s+for update/i);
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /m\.organization_id = p_organization_id\s+and m\.user_id = v_user_id\s+and m\.status = 'active'\s+and m\.role = 'owner'/i);
});

test("approval execution rejects expired, unapproved, unsupported, and already-started requests", () => {
  assert.match(migration, /v_request\.status <> 'approved'/i);
  assert.match(migration, /v_request\.expires_at <= now\(\)/i);
  assert.match(migration, /v_request\.action_type <> 'create_task'/i);
  assert.match(migration, /v_request\.execution_status <> 'pending'/i);
});

test("approval execution records running and succeeded states inside the transaction", () => {
  assert.match(migration, /set execution_status = 'running'/i);
  assert.match(migration, /insert into public\.tasks\s*\([\s\S]*?p_organization_id, v_request\.summary, v_request\.details, 'medium', v_user_id/i);
  assert.match(migration, /set execution_status = 'succeeded'/i);
  assert.match(migration, /language plpgsql\s+security invoker/i);
});

test("approval execution RPC has explicit grants and no public or anonymous execution", () => {
  assert.match(migration, /revoke all on function public\.execute_approved_task_request\(uuid, uuid\) from public/i);
  assert.match(migration, /revoke all on function public\.execute_approved_task_request\(uuid, uuid\) from anon/i);
  assert.match(migration, /revoke all on function public\.execute_approved_task_request\(uuid, uuid\) from authenticated/i);
  assert.match(migration, /grant execute on function public\.execute_approved_task_request\(uuid, uuid\) to authenticated/i);
});
