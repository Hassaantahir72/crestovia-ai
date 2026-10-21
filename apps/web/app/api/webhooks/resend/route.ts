import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CLOCK_SKEW_SECONDS = 300;
const MAX_BODY_BYTES = 256_000;

type BoundedBodyResult =
  | { ok: true; rawBody: string }
  | { ok: false; reason: "too_large" | "read_failed" };

/** Read incrementally so oversized bodies are rejected before buffering them in full. */
async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  if (!request.body) return { ok: true, rawBody: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
    return { ok: true, rawBody: Buffer.concat(chunks, totalBytes).toString("utf8") };
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, reason: "read_failed" };
  } finally {
    reader.releaseLock();
  }
}

function verifyResendSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!secret || !id || !timestamp || !signatureHeader || !/^\d{10}$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : "";
  if (!encodedSecret) return false;
  let key: Buffer;
  try { key = Buffer.from(encodedSecret, "base64"); } catch { return false; }
  if (!key.length) return false;

  const expected = createHmac("sha256", key).update(id + "." + timestamp + "." + rawBody, "utf8").digest("base64");
  const candidates = signatureHeader.split(" ").flatMap((entry) => {
    const comma = entry.indexOf(",");
    return comma > 0 && entry.slice(0, comma) === "v1" ? [entry.slice(comma + 1)] : [];
  });
  return candidates.some((candidate) => {
    try {
      const actualBytes = Buffer.from(candidate, "base64");
      const expectedBytes = Buffer.from(expected, "base64");
      return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
    } catch { return false; }
  });
}

export async function POST(request: Request) {
  const bodyResult = await readBoundedBody(request);
  if (!bodyResult.ok) {
    if (bodyResult.reason === "too_large") return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const rawBody = bodyResult.rawBody;
  if (!verifyResendSignature(rawBody, request.headers)) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  let event: unknown;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!event || typeof event !== "object" || Array.isArray(event)) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const value = event as Record<string, unknown>;
  if (typeof value.type !== "string" || !value.data || typeof value.data !== "object" || Array.isArray(value.data)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }
  const eventId = request.headers.get("svix-id");
  const data = value.data as Record<string, unknown>;
  if (!eventId || typeof data.email_id !== "string" || !data.email_id || data.email_id.length > 200) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const eventStatus: Record<string, "delivered" | "bounced" | "complained"> = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained"
  };
  const status = eventStatus[value.type];
  if (!status) return NextResponse.json({ received: true, ignored: true });

  const admin = createAdminClient();
  const { data: result, error } = await admin.rpc("apply_resend_delivery_event", {
    p_event_id: eventId,
    p_event_type: value.type,
    p_provider_message_id: data.email_id,
    p_status: status
  });
  if (error) return NextResponse.json({ error: "event_processing_failed" }, { status: 500 });
  return NextResponse.json({ received: true, result });
}
