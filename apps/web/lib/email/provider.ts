import "server-only";

export type ApprovedEmailPayload = { to: string; subject: string; text: string };
export type EmailSendResult = { id: string };

export function emailProviderReadiness() {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.RESEND_FROM_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.RESEND_FROM_EMAIL)) missing.push("RESEND_FROM_EMAIL");
  return { ready: missing.length === 0, missing };
}

export function validateApprovedEmailPayload(raw: string): ApprovedEmailPayload {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("EMAIL_DETAILS_MUST_BE_JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("EMAIL_DETAILS_INVALID");
  const value = parsed as Record<string, unknown>;
  if (typeof value.to !== "string" || value.to.length > 254 || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value.to.trim())) throw new Error("EMAIL_RECIPIENT_INVALID");
  if (typeof value.subject !== "string" || value.subject.trim().length < 1 || value.subject.trim().length > 180 || /[\r\n]/.test(value.subject)) throw new Error("EMAIL_SUBJECT_INVALID");
  if (typeof value.text !== "string" || value.text.trim().length < 1 || value.text.length > 4000) throw new Error("EMAIL_BODY_INVALID");
  return { to: value.to.trim(), subject: value.subject.trim(), text: value.text.trim() };
}

export async function sendApprovedEmail(payload: ApprovedEmailPayload, idempotencyKey: string): Promise<EmailSendResult> {
  const readiness = emailProviderReadiness();
  if (!readiness.ready) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [payload.to], subject: payload.subject, text: payload.text }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error("EMAIL_PROVIDER_REJECTED_" + response.status);
  const result = await response.json() as { id?: unknown };
  if (typeof result.id !== "string" || !result.id) throw new Error("EMAIL_PROVIDER_INVALID_RESPONSE");
  return { id: result.id };
}
