import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 256_000;

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(request: Request): Promise<string | null> {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) { await reader.cancel().catch(() => undefined); return null; }
      chunks.push(value);
    }
    return Buffer.concat(chunks, total).toString("utf8");
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  } finally { reader.releaseLock(); }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected || mode !== "subscribe" || !token || !challenge || token !== expected) {
    return NextResponse.json({ error: "verification_failed" }, { status: 403 });
  }
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

type WhatsAppMessage = { id?: string; from?: string; type?: string; text?: { body?: string }; timestamp?: string };
type WhatsAppPayload = { entry?: Array<{ changes?: Array<{ value?: { messages?: WhatsAppMessage[]; metadata?: { display_phone_number?: string; phone_number_id?: string } } }> }> };

export async function POST(request: Request) {
  const rawBody = await readBody(request);
  if (rawBody === null) return NextResponse.json({ error: "payload_too_large_or_unreadable" }, { status: 413 });
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  let payload: WhatsAppPayload;
  try { payload = JSON.parse(rawBody) as WhatsAppPayload; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
  if (!organizationId) return NextResponse.json({ error: "integration_not_configured" }, { status: 503 });
  const events: Array<{ organization_id: string; provider_message_id: string; direction: "inbound"; from_phone: string; to_phone: string; message_text: string; status: "received" }> = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const toPhone = value?.metadata?.display_phone_number ?? "";
      for (const message of value?.messages ?? []) {
        if (!message.id || !message.from || !toPhone) continue;
        // Only persist text messages. Media is deliberately not downloaded or stored by this webhook.
        const body = message.type === "text" ? message.text?.body ?? "" : "[" + (message.type ?? "unsupported") + " message]";
        events.push({
          organization_id: organizationId, provider_message_id: message.id, direction: "inbound",
          from_phone: message.from.slice(0, 32), to_phone: toPhone.slice(0, 32),
          message_text: body.slice(0, 4000), status: "received",
        });
      }
    }
  }
  if (events.length) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from("whatsapp_message_events").upsert(events, { onConflict: "provider_message_id", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: "event_persist_failed" }, { status: 503 });
    } catch {
      return NextResponse.json({ error: "integration_not_configured" }, { status: 503 });
    }
  }
  return NextResponse.json({ received: true });
}
