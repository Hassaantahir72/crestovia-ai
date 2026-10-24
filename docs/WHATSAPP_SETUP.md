# Crestovia AI WhatsApp Cloud API setup

WhatsApp is an optional external integration; it does not replace internal team chat.

## Private Render environment variables

Set these on the web service only. Never place credentials in source control or NEXT_PUBLIC variables:

- `WHATSAPP_ACCESS_TOKEN`: Meta Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: sender phone-number ID from Meta.
- `WHATSAPP_APP_SECRET`: Meta app secret used to verify HMAC signatures.
- `WHATSAPP_VERIFY_TOKEN`: long random string also entered in Meta webhook setup.
- `WHATSAPP_API_VERSION`: currently supported Graph API version from Meta documentation.
- `WHATSAPP_ORGANIZATION_ID`: organization UUID authorized for this integration.

## Meta setup

1. Configure WhatsApp Cloud API and verify the sending number in Meta for Developers.
2. Set callback URL to `https://YOUR-WEB-SERVICE-DOMAIN/api/webhooks/whatsapp`.
3. Enter the same `WHATSAPP_VERIFY_TOKEN` and subscribe to the `messages` field.
4. Send a test inbound message and confirm an event appears in Dashboard → WhatsApp Cloud API.
5. Test outbound messages only with opted-in recipients. Approved templates may be required outside the customer-service window.

## Release order

1. Review and apply `database/migrations/0038_direct_messages_and_whatsapp.sql` to staging after migration 0037.
2. Verify two-member DM isolation with two accounts and two organizations.
3. Test invalid webhook signatures, oversized requests, duplicate message IDs, and a valid inbound message.
4. Test a real outbound message with an opted-in test recipient.
5. Apply to production only after explicit owner approval and a verified backup/rollback plan.

The webhook caps request bodies at 256 KB, requires Meta's HMAC signature, deduplicates provider message IDs, and does not download media. Inbound message text is stored for owners/admins in the organization event ledger.
