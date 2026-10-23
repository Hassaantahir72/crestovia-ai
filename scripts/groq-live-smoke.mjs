import { pathToFileURL } from "node:url";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function checkGroqCompletion({
  apiKey = process.env.GROQ_API_KEY,
  model = process.env.GROQ_MODEL || DEFAULT_MODEL,
  fetchImpl = fetch,
  timeoutMs = 10_000,
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return { ok: false, category: "missing_configuration", message: "GROQ_API_KEY is not configured" };
  }
  if (typeof model !== "string" || !/^[A-Za-z0-9._:-]{1,120}$/.test(model)) {
    return { ok: false, category: "invalid_configuration", message: "GROQ_MODEL has an invalid format" };
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    return { ok: false, category: "invalid_configuration", message: "Timeout must be between 1 and 30000 ms" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        temperature: 0,
        max_tokens: 8,
      }),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, category: "authentication_rejected", status: response.status, model };
    }
    if (response.status === 429) {
      return { ok: false, category: "rate_limited", status: response.status, model };
    }
    if (!response.ok) return { ok: false, category: "provider_error", status: response.status, model };

    let payload;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, category: "invalid_provider_response", model };
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return { ok: false, category: "invalid_provider_response", model };
    }
    return { ok: true, category: "completion_succeeded", status: response.status, model };
  } catch (error) {
    return { ok: false, category: error?.name === "AbortError" ? "timeout" : "network_or_tls_error", model };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const result = await checkGroqCompletion();
  if (result.ok) {
    process.stdout.write(`Groq completion: passed (${result.model}, HTTP ${result.status})\n`);
    process.stdout.write("The response content and credential were not printed or stored.\n");
    return;
  }
  process.stderr.write(`Groq completion: ${result.category}${result.status ? ` (HTTP ${result.status})` : ""}\n`);
  process.stderr.write(`${result.message || "No response content or credential was logged."}\n`);
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
