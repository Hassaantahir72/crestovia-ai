import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql = readFileSync(new URL("../database/migrations/0037_native_team_chat_foundation_v0_3_8.sql", import.meta.url), "utf8");
const page = readFileSync(new URL("../apps/web/app/dashboard/chat/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../apps/web/app/dashboard/chat/actions.ts", import.meta.url), "utf8");

test("team chat schema is tenant-scoped with composite organization foreign keys", () => {
  for (const table of ["team_channels", "team_channel_members", "team_messages"]) {
    assert.match(sql, new RegExp("create table if not exists public\." + table));
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
  assert.match(page, /Channels and private direct messages, separate from your private AI chat/);
  assert.match(page, /eq\("organization_id",membership\.organization_id\)\.eq\("channel_id",activeChannel\.id\)/);
  assert.match(actions, /author_id:user\.id/);
  assert.match(actions, /eq\("organization_id",membership\.organization_id\)/);
  assert.match(actions, /length > 8000/);
});

const extensions = readFileSync(new URL("../database/migrations/0038_direct_messages_and_whatsapp.sql", import.meta.url), "utf8");
const whatsappRoute = readFileSync(new URL("../apps/web/app/api/webhooks/whatsapp/route.ts", import.meta.url), "utf8");
const whatsappActions = readFileSync(new URL("../apps/web/app/dashboard/integrations/whatsapp/actions.ts", import.meta.url), "utf8");

test("direct messages are created only through an active same-organization RPC", () => {
  assert.match(extensions, /create or replace function public\.create_direct_team_channel/);
  assert.match(extensions, /security definer/);
  assert.match(extensions, /active_same_organization_membership_required/);
  assert.match(extensions, /revoke all on function public\.create_direct_team_channel/);
  assert.match(extensions, /create or replace function public\.list_active_team_members/);
  assert.match(extensions, /grant execute on function public\.list_active_team_members/);
  assert.match(extensions, /revoke update, delete on public\.team_channels from authenticated/);
  assert.match(extensions, /grant update \(name, slug, description, updated_at\) on public\.team_channels to authenticated/);
  assert.match(extensions, /pg_advisory_xact_lock/);
  assert.match(extensions, /create or replace function public\.touch_team_channel/);
  assert.match(extensions, /grant execute on function public\.touch_team_channel/);
  assert.match(actions, /touch_team_channel/);
  assert.match(actions, /create_direct_team_channel/);
});

test("WhatsApp events are organization-scoped and webhook security remains enforced", () => {
  assert.match(extensions, /create table if not exists public\.whatsapp_message_events/);
  assert.match(extensions, /owners and admins read organization WhatsApp events/);
  assert.match(whatsappRoute, /verifyMetaSignature/);
  assert.match(whatsappRoute, /readBoundedBody/);
  assert.match(whatsappRoute, /whatsapp_message_events/);
  assert.match(whatsappRoute, /ignoreDuplicates: true/);
  assert.match(whatsappActions, /\["owner", "admin"\]/);
  assert.match(whatsappActions, /redirect: "error"/);
});
