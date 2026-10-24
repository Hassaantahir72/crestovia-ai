# WhatsApp Cloud API + n8n — implementation plan

## Current state
The route is an opt-in ingress scaffold. It supports Meta's GET verification challenge and validates POST signatures over the original raw body before parsing or forwarding. It does not mean a Meta app, phone number, n8n workflow, or live messaging account is connected.

## Required private configuration
- `WHATSAPP_APP_SECRET`: Meta app secret; at least 32 characters.
- `WHATSAPP_VERIFY_TOKEN`: random verification token; at least 32 characters.
- `N8N_WHATSAPP_WEBHOOK_URL`: HTTPS URL for a trusted n8n webhook.
- `N8N_WEBHOOK_SECRET`: independent shared secret; at least 32 characters.

Never commit real values or put them in `NEXT_PUBLIC_*` variables. Leave the integration disabled until staging acceptance is complete.

## Before enabling live messages
- Add durable ingestion/queueing and idempotency keyed to Meta event identifiers.
- Map senders to an organization using an owner-approved verified mapping; never trust tenant identifiers supplied in message content.
- Enforce consent, opt-out, sender allowlists, rate limits, retention limits, and privacy-safe logging.
- Treat all inbound message text as untrusted instructions; do not allow a message to bypass organization permissions or action approvals.
- Implement retries, dead-letter/reconciliation, delivery status handling, and controlled outbound replies through the official WhatsApp Cloud API.
- Test valid/invalid signatures, challenge verification, duplicate delivery, oversized bodies, timeout/retry behavior, unknown senders, opt-out, and tenant isolation in staging.
- Configure Meta webhook subscriptions and verify the endpoint with the real Meta dashboard only after staging acceptance.

The current route forwards to the configured HTTPS endpoint and rejects obvious local/IP-literal targets, but that guardrail is not a replacement for fixed trusted-host configuration and network egress controls.
