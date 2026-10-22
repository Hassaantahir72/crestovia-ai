# Live Groq completion smoke check

This operator-run check verifies that the configured Groq key can complete one tiny chat-completions request. It does not contact Supabase, send email, save a conversation, or modify company records.

## Run privately

From `apps/web`, with `GROQ_API_KEY` configured in your private environment:

```sh
npm run smoke:groq
```

The default model is `llama-3.3-70b-versatile`; set `GROQ_MODEL` privately if the account uses another model. Do not put keys in command-line arguments, paste them into chat, or commit them.

The request uses the fixed HTTPS Groq endpoint, blocks redirects, times out after 10 seconds, and caps output at eight tokens. It prints only a status category, HTTP status where available, and model name. It does not print the generated response or provider error body. The request consumes a small amount of API quota.

## Result categories

- `completion_succeeded`: the provider returned non-empty completion content.
- `missing_configuration` / `invalid_configuration`: local environment settings need attention.
- `authentication_rejected`: the provider rejected credentials.
- `rate_limited`: quota or rate limits prevented the request.
- `provider_error`: another non-success HTTP status was returned.
- `timeout` / `network_or_tls_error`: the request did not complete normally.

CI tests use mocked fetch responses and do not contact Groq. Passing this smoke check is not proof of full assistant UX, authorization, reliability, or production readiness.

## Assistant chat runtime behavior

The production assistant chat request is separately bounded to 20 seconds and blocks HTTP redirects. An invalid model identifier is rejected locally. Timeout and malformed JSON errors are mapped to safe UI messages; the application does not display raw provider error bodies. The smoke command verifies a single provider completion only and does not prove full chat or authorization behavior.
