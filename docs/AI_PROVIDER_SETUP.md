# AI provider setup (Groq)

Crestovia AI uses a server-side Groq-compatible chat-completions adapter for assistant replies. The application must never send this key to the browser.

## Configure the key privately

1. Create or open your Groq API key in your Groq account.
2. For local development, place it in `apps/web/.env.local` as `GROQ_API_KEY=...`. Keep that file out of Git.
3. For hosted development, add `GROQ_API_KEY` in the web service's private environment/secrets settings. Do not use a `NEXT_PUBLIC_*` name.
4. Optionally set `GROQ_MODEL` to a model available to your account. If omitted, the app currently uses `llama-3.3-70b-versatile`.
5. Restart the local server or redeploy/restart the hosted service after changing environment variables.
6. Sign in and send a short test message on the Assistant page.

## Interpreting the readiness notice

- **Not configured** means the server process cannot see `GROQ_API_KEY`.
- **Key detected** means only that the environment variable is present. It does not prove that the key is valid, has quota, or that the provider is reachable.
- Authentication errors indicate rejected credentials; rate-limit errors mean the provider limited requests; other request errors may be transient or model/configuration related.

## Secret handling

- Never paste API keys into ChatGPT, tickets, screenshots, or source files.
- Never commit `.env.local`, provider keys, or server-only Supabase secrets.
- Never expose the key through `NEXT_PUBLIC_GROQ_API_KEY` or another browser-visible variable.
- Rotate the key immediately if it is accidentally exposed.
- A missing key does not disable the rest of the company workspace. Assistant replies require it; read-only dashboard features do not.

## Run the built-in connection test

When signed in as the organization owner, open Dashboard → AI assistant and select **Test AI connection**. The test sends one short prompt from the server with a 10-second timeout and a small token limit. It does not save a chat message or change company records. The result confirms that the configured model answered at that moment; it does not prove production capacity or long-term availability. Only the owner can trigger this test, and the API key is never returned to the browser.

## What remains to validate

The readiness notice is a presence check only. A real successful request, provider error behavior, quota limits, and secret configuration must still be verified in a private test environment before production launch. Public deployment remains deferred until the owner approves it.


## Run a live Groq completion smoke check

From `apps/web`, run `npm run smoke:groq` in an environment where `GROQ_API_KEY` is privately configured. The script makes one request to the fixed Groq chat-completions HTTPS endpoint, uses a 10-second timeout and an eight-token cap, and reports only the result category, HTTP status, and model. It does not print or store the key or generated response. It does consume a small amount of provider quota. The script is a provider smoke test, not a full application acceptance test.

For a custom model, set `GROQ_MODEL` privately before running it. Do not pass keys as command-line arguments, paste them into chat, or commit them. CI tests use mocked responses and never contact Groq.
