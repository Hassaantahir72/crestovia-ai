import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql = readFileSync(new URL("../database/migrations/0037_native_team_chat_foundation_v0_3_8.sql", import.meta.url), "utf8");
const page = readFileSync(new URL("../apps/web/app/dashboard/chat/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../apps/web/app/dashboard/chat/actions.ts", import.meta.url), "utf8");

test("team chat schema is tenant-scoped with composite organization foreign keys", () => {
  for (const table of ["team_channels", "team_channel_members", "team_messages"]) {
    assert.match(sql, new RegExp("create table if not exists public\\." + table));
  }
  assert.match(sql, /foreign key \(organization_id, channel_id\)/);
  assert.match(sql, /foreign key \(organization_id, author_id\)/);
  assert.match(sql, /alter table public\.team_messages enable row level security/);
  assert.match(sql, /revoke all on public\.team_messages from anon/);
});

test("team chat read and write policies require active organization membership", () => {
  assert.match(sql, /active members read visible team channels/);
  assert.match(sql, /active members read visible channel messages/);
  assert.match(sql, /active members post to visible team channels/);
  assert.match(sql, /m\.status = 'active'/);
  assert.match(sql, /author_id = \(select auth\.uid\(\)\)/);
});

test("chat UI is separate from assistant and scopes messages to selected organization and channel", () => {
  assert.match(page, /Company conversations, separate from your private AI chat/);
  assert.match(page, /eq\("organization_id",membership\.organization_id\)\.eq\("channel_id",activeChannel\.id\)/);
  assert.match(actions, /author_id:user\.id/);
  assert.match(actions, /eq\("organization_id",membership\.organization_id\)/);
  assert.match(actions, /length > 8000/);
});
