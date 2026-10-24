# Crestovia AI WhatsApp Cloud API setup

WhatsApp is an optional external messaging integration. It does not replace the internal Team Chat module.

## Required private Render environment variables

Set these on the **web service** (never in source control or a NEXT_PUBLIC variable):

- `WHATSAPP_ACCESS_TOKEN`: Meta WhatsApp Cloud API access token.
- `WHATSAPP_PHONE_NUMBER_ID`: the sending phone-number ID from Meta's WhatsApp API setup.
- `WHATSAPP_APP_SECRET`: Meta app secret used to verify `X-Hub-Signature-256`.
- `WHATSAPP_VERIFY_TOKEN`: a long random string you choose and also enter in Meta webhook configuration.
- `WHATSAPP_API_VERSION`: a currently supported Graph API version, e.g. the version shown in your Meta app docs.
- `WHATSAPP_ORGANIZATION_ID`: UUID of the organization allowed to use this integration; must match the logged-in owner's active organization.

Do not share tokens in chat, commit them, or paste them into source files. Rotate any token that has been exposed.

## Configure Meta webhook

1. In Meta for Developers, configure the WhatsApp product and verify the sending phone number.
2. Set callback URL to `https://YOUR-WEB-SERVICE-DOMAIN/api/webhooks/whatsapp`.
3. Enter the same random `WHATSAPP_VERIFY_TOKEN` and subscribe to the `messages` webhook field.
4. Send a test message to the connected business number and verify an inbound event appears in **Dashboard → WhatsApp Cloud API**.
5. Test outbound messaging only with an opted-in recipient. Template messages may be required outside Meta's customer-service window.

## Database and release order

1. Review `database/migrations/0037_team_chat_and_whatsapp.sql`.
2. Apply it to a non-production Supabase project first, then verify RLS and privileges.
3. Deploy the code to staging, test team channel/direct-message isolation and WhatsApp webhook signature rejection.
4. Apply to production only after explicit owner approval and verified backup/rollback plan.

The webhook accepts only signed POSTs, caps the request body at 256 KB, deduplicates provider message IDs, and stores message text (up to 4,000 characters) without downloading media. Owners/admins can view the organization event ledger. Treat message content as confidential company data.
