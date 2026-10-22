# Provider connectivity checks

The repository includes a read-only provider diagnostic at \`scripts/provider-connectivity-check.mjs\`.

## Run locally

Set these variables in your local shell or secret manager; do not commit them or paste them into chat:

- \`GROQ_API_KEY\`
- \`RESEND_API_KEY\`

Then run:

\`\`\`bash
node scripts/provider-connectivity-check.mjs
\`\`\`

The script calls only the fixed HTTPS endpoints \`https://api.groq.com/openai/v1/models\` and \`https://api.resend.com/domains\` with GET requests. It does not send email, create resources, change provider settings, print tokens, or print response bodies. A connected result proves that the supplied credential can access that endpoint at the time of the check; it does not prove that chat completions, sender-domain verification, webhook signatures, email delivery, or cron scheduling work end-to-end.

## Result meanings

- \`connected\`: provider accepted the request.
- \`missing_configuration\`: the environment variable is absent.
- \`authentication_rejected\`: provider returned HTTP 401/403; check the credential and its permissions privately.
- \`provider_error\`: provider returned another non-success HTTP status.
- \`timeout\` / \`network_or_tls_error\`: check outbound network access and provider availability.

The command exits non-zero unless both providers respond successfully. Run it only from a trusted local environment with staging or intended provider credentials. Never use production secrets in test logs or commit them to the repository.

## Still required for release acceptance

1. Make a real, non-sensitive Groq completion through the application using the configured model.
2. Verify Resend sender-domain/DNS configuration and deliver a test email to an explicitly approved test inbox.
3. Verify the Resend webhook signature and event handling with a provider test event.
4. Verify scheduled reminders and cron authentication, retry behavior, duplicate suppression, and failure recovery.
