# Native team chat — v1 scope

## Product intent
Crestovia AI is the company's operating workspace. Team members should communicate inside the product; the AI assistant remains a separate private assistant conversation. WhatsApp is a later optional bridge for reminders and approved off-platform interactions, not the canonical team chat.

## Included in this increment
- A dedicated `/dashboard/chat` page, separate from `/dashboard/assistant`.
- Organization-scoped public channels, text messages, and private one-to-one direct messages.
- Owner/admin/manager channel creation.
- Active-membership checks, RLS, composite organization foreign keys, message length limits, author binding, and a database RPC that creates DMs only between active members of the same organization.
- No channel message is automatically sent to Groq or WhatsApp.

## Not yet included
- Private-channel membership management UI.
- Typing indicators, read receipts, file uploads, emoji reactions, search, push notifications, and message edit/delete. Supabase Realtime message delivery is implemented with a 30-second fallback refresh when the connection is unavailable.
- Assistant participation inside internal channels. That must be an explicit, permission-aware feature, not an automatic leak of private assistant memory into company channels.
- Optional direct Jarvis replies over WhatsApp are implemented behind `WHATSAPP_AI_REPLY_ENABLED` and owner/admin-managed staff phone mappings. The responder has recent WhatsApp history and read-only context limited to the linked member’s assigned tasks and projects; it has no action tools and does not access private assistant memory or other employees’ records.
- Staging has migrations 0037–0040 applied. Production has not been migrated. Cross-tenant acceptance with real signed-in test users and live Realtime connection testing are still required before production rollout.

## Acceptance checklist
1. Apply migration 0037, then 0038 to staging only after review.
2. Test two organizations with owner/admin/manager/member/suspended users.
3. Confirm public channels and messages are visible only to active members of the same organization.
4. Confirm a member cannot create channels, impersonate another author, read another tenant's channel, or post after suspension.
5. Confirm private channels remain hidden unless the viewer has a channel membership.
6. Run web lint, TypeScript, production build, API tests, and migration-order checks.
7. Verify realtime events and cross-tenant behavior in staging before any production migration or deploy.
