# Crestovia AI WhatsApp Cloud API setup

WhatsApp is an optional external integration; it does not replace internal team chat.

## Private Render environment variables

Set these on the web service only. Never place credentials in source control or NEXT_PUBLIC variables:

- `WHATSAPP_ACCESS_TOKEN`: Meta Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: sender phone-number ID from Meta.
- `WHATSAPP_APP_SECRET`: Meta app secret used to verify HMAC signatures.
- `WHATSAPP_VERIFY_TOKEN`: long random string also entered in Meta webhook setup.
- `WHATSAPP_API_VERSION`: currently supported Graph API version from Meta documentation.
- `WHATSAPP_ORGANIZATION_ID`: organization UUID authorized for this integration and event ledger.
- `WHATSAPP_AI_REPLY_ENABLED`: set to `true` only when you want direct Groq-powered Crestovai AI replies; defaults to disabled.
- Staff phone mappings are managed in Dashboard → WhatsApp Cloud API by an owner/admin. Link a number only after verifying that the employee controls it; numbers must include country code and contain digits only.
- `N8N_WHATSAPP_WEBHOOK_URL`: HTTPS n8n workflow endpoint that receives verified webhook events.
- `N8N_WEBHOOK_SECRET`: a separate random secret (at least 32 characters) shared with that n8n workflow. The existing webhook validates this configuration before forwarding inbound events.

## Meta setup

1. Configure WhatsApp Cloud API and verify the sending number in Meta for Developers.
2. Set callback URL to `https://YOUR-WEB-SERVICE-DOMAIN/api/webhooks/whatsapp`.
3. Enter the same `WHATSAPP_VERIFY_TOKEN` and subscribe to the `messages` field.
4. Send a test inbound message and confirm an event appears in Dashboard → WhatsApp Cloud API.
5. Test outbound messages only with opted-in recipients. Approved templates may be required outside the customer-service window.
6. To enable Crestovai AI replies, link and verify the staff phone number in the WhatsApp dashboard and set `WHATSAPP_AI_REPLY_ENABLED=true`. Start with one test number. Do not enable an overlapping n8n AI responder at the same time.

## Release order

1. Review and apply `database/migrations/0038_direct_messages_and_whatsapp.sql` to staging after migration 0037.
2. Verify two-member DM isolation with two accounts and two organizations.
3. Test invalid webhook signatures, oversized requests, duplicate message IDs, and a valid inbound message.
4. Test a real outbound message with an opted-in test recipient.
5. Apply to production only after explicit owner approval and a verified backup/rollback plan.

The webhook caps request bodies at 1 MB, requires Meta's HMAC signature, deduplicates provider message IDs, forwards verified events to the configured n8n HTTPS endpoint, and does not download media. When `WHATSAPP_ORGANIZATION_ID` is configured, inbound message text is also stored for owners/admins in the organization event ledger. Optional direct Crestovai AI replies are off by default, limited to newly stored text messages from active owner-managed staff phone mappings, and best-effort rate-limited to 20 inbound messages per sender per hour. The WhatsApp AI responder verifies that the sender number is linked to an active organization member and can use recent WhatsApp history plus read-only context limited to that member’s assigned tasks and explicitly assigned projects. It does not access private assistant memory, other employees’ records, broad company data, or action tools. It cannot create/update tasks, send reminders, or approve requests. Use the authenticated workspace for changes and approvals.
