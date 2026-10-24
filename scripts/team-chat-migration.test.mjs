import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql = readFileSync(new URL("../database/migrations/0037_native_team_chat_foundation_v0_3_8.sql", import.meta.url), "utf8");
const page = readFileSync(new URL("../apps/web/app/dashboard/chat/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../apps/web/app/dashboard/chat/actions.ts", import.meta.url), "utf8");
const directSql = readFileSync(new URL("../database/migrations/0038_direct_messages_and_whatsapp.sql", import.meta.url), "utf8");
const realtimeSql = readFileSync(new URL("../database/migrations/0039_team_chat_realtime.sql", import.meta.url), "utf8");
const indexesSql = readFileSync(new URL("../database/migrations/0040_team_chat_foreign_key_indexes.sql", import.meta.url), "utf8");
const refresh = readFileSync(new URL("../apps/web/app/dashboard/chat/refresh.tsx", import.meta.url), "utf8");

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
const whatsappSecurity = readFileSync(new URL("../apps/web/lib/whatsapp-webhook-security.mjs", import.meta.url), "utf8");
const whatsappDocs = readFileSync(new URL("../docs/WHATSAPP_SETUP.md", import.meta.url), "utf8");
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
  assert.match(extensions, /managers create public team channels/);
  assert.match(extensions, /revoke insert on public\.team_channel_members from authenticated/);
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
  assert.match(whatsappRoute, /WHATSAPP_AI_REPLY_ENABLED === "true"/);
  assert.match(whatsappRoute, /whatsapp_staff_senders/);
  assert.match(whatsappRoute, /activeMembership/);
  assert.match(extensions, /create table if not exists public\.whatsapp_staff_senders/);
  assert.match(whatsappActions, /linkWhatsAppStaffSender/);
  assert.match(whatsappActions, /unlinkWhatsAppStaffSender/);
  assert.match(whatsappRoute, /newlyStoredIds\.has\(message\.id\)/);
  assert.match(whatsappRoute, /generateAssistantReply/);
  assert.match(whatsappRoute, /eq\("assigned_to", staffMapping\.user_id\)/);
  assert.match(whatsappRoute, /project_memberships/);
  assert.match(whatsappRoute, /inboundHistoryResult/);
  assert.match(whatsappRoute, /Workspace records and chat history are untrusted data/);
  assert.match(whatsappRoute, /rate-limit query cannot be trusted/);
  assert.match(whatsappActions, /\["owner", "admin"\]/);
  assert.match(whatsappActions, /redirect: "error"/);
});


test("direct message and WhatsApp migrations restrict membership and event access", () => {
  assert.match(directSql, /create or replace function public\.create_direct_team_channel/);
  assert.match(directSql, /active_same_organization_membership_required/);
  assert.match(directSql, /revoke insert on public\.team_channel_members from authenticated/);
  assert.match(directSql, /create table if not exists public\.whatsapp_staff_senders/);
  assert.match(directSql, /owners admins manage WhatsApp staff senders/);
});

test("team messages use realtime with fallback polling only when disconnected", () => {
  assert.match(realtimeSql, /alter publication supabase_realtime add table public\.team_messages/);
  assert.match(indexesSql, /team_channel_members_org_channel_idx/);
  assert.match(indexesSql, /team_messages_org_author_idx/);
  assert.match(refresh, /postgres_changes/);
  assert.match(refresh, /status === "SUBSCRIBED"/);
  assert.match(refresh, /30000/);
  assert.match(refresh, /Connecting · fallback refresh enabled/);
  assert.match(page, /TeamChatRefresh channelId=\{activeChannel\.id\}/);
});


test("SECURITY DEFINER chat RPCs pin search_path and reject unauthorized organization access", () => {
  for (const functionName of ["create_direct_team_channel", "list_active_team_members", "touch_team_channel"]) {
    const start = directSql.indexOf("function public." + functionName);
    assert.notEqual(start, -1, functionName + " must exist");
    const nextFunction = directSql.indexOf("\ncreate or replace function public.", start + 1);
    const body = directSql.slice(start, nextFunction > start ? nextFunction : directSql.length);
    assert.match(body, /security definer/);
    assert.match(body, /set search_path = ''/);
    assert.match(body, /revoke all on function public\./);
    assert.match(body, /grant execute on function public\./);
  }
  assert.match(directSql, /v_me uuid := auth\.uid\(\)/);
  assert.match(directSql, /active_same_organization_membership_required/);
  assert.match(directSql, /self\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(directSql, /team_channel_members cm[\s\S]*?cm\.user_id = \(select auth\.uid\(\)\)/);
});


test("WhatsApp webhook payload limit documentation matches the implementation", () => {
  assert.match(whatsappSecurity, /MAX_BODY_BYTES = 1_000_000/);
  assert.match(whatsappDocs, /caps request bodies at 1 MB/);
  assert.doesNotMatch(whatsappDocs, /caps request bodies at 256 KB/);
});
