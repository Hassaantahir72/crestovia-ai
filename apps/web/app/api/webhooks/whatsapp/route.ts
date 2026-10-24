import { createAdminClient } from "@/lib/supabase/admin";
import { constantTimeStringEqual, isValidForwardUrl, readBoundedBody, verifyMetaSignature } from "../../../../lib/whatsapp-webhook-security.mjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARD_TIMEOUT_MS = 8_000;
const NO_STORE = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected || expected.length < 32) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503, headers: NO_STORE });
  }
  if (mode !== "subscribe" || !token || !challenge || !constantTimeStringEqual(token, expected)) {
    return NextResponse.json({ error: "verification_failed" }, { status: 403, headers: NO_STORE });
  }
  return new Response(challenge, { status: 200, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  const read = await readBoundedBody(request);
  if (!read.ok) {
    return NextResponse.json({ error: read.reason === "too_large" ? "payload_too_large" : "invalid_body" }, {
      status: read.reason === "too_large" ? 413 : 400, headers: NO_STORE,
    });
  }
  if (!verifyMetaSignature(read.body, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401, headers: NO_STORE });
  }

  let event: unknown;
  try { event = JSON.parse(read.body.toString("utf8")); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE }); }
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400, headers: NO_STORE });
  }
  const record = event as Record<string, unknown>;
  if (record.object !== "whatsapp_business_account" || !Array.isArray(record.entry)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400, headers: NO_STORE });
  }

  // Persist normalized inbound messages when the organization ledger is configured.
  // Keep the existing signed, bounded n8n forwarder intact for automation workflows.
  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
  if (organizationId) {
    const events: Array<{ organization_id: string; provider_message_id: string; direction: "inbound"; from_phone: string; to_phone: string; message_text: string; status: "received" }> = [];
    for (const entry of record.entry as Array<Record<string, unknown>>) {
      const changes = Array.isArray(entry.changes) ? entry.changes as Array<Record<string, unknown>> : [];
      for (const change of changes) {
        const value = change.value && typeof change.value === "object" ? change.value as Record<string, unknown> : {};
        const metadata = value.metadata && typeof value.metadata === "object" ? value.metadata as Record<string, unknown> : {};
        const toPhone = typeof metadata.display_phone_number === "string" ? metadata.display_phone_number : "";
        const messages = Array.isArray(value.messages) ? value.messages as Array<Record<string, unknown>> : [];
        for (const message of messages) {
          const id = typeof message.id === "string" ? message.id : "";
          const from = typeof message.from === "string" ? message.from : "";
          if (!id || !from || !toPhone) continue;
          const textValue = message.text && typeof message.text === "object" ? (message.text as Record<string, unknown>).body : "";
          const kind = typeof message.type === "string" ? message.type : "unsupported";
          const body = kind === "text" && typeof textValue === "string" ? textValue : "[" + kind + " message]";
          events.push({ organization_id: organizationId, provider_message_id: id, direction: "inbound", from_phone: from.slice(0, 32), to_phone: toPhone.slice(0, 32), message_text: body.slice(0, 4000), status: "received" });
        }
      }
    }
    if (events.length) {
      try {
        const { error } = await createAdminClient().from("whatsapp_message_events").upsert(events, { onConflict: "provider_message_id", ignoreDuplicates: true });
        if (error) return NextResponse.json({ error: "event_persist_failed" }, { status: 503, headers: NO_STORE });
      } catch {
        return NextResponse.json({ error: "event_persist_failed" }, { status: 503, headers: NO_STORE });
      }
    }
  }

  const target = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  const sharedSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!target || !sharedSecret || sharedSecret.length < 32 || !isValidForwardUrl(target)) {
    return NextResponse.json({ error: "forwarder_not_configured" }, { status: 503, headers: NO_STORE });
  }

  try {
    const forwarded = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Crestovia-Webhook-Secret": sharedSecret,
        "X-Crestovia-Webhook-Source": "meta-whatsapp-cloud-api",
      },
      body: new Uint8Array(read.body),
      redirect: "error",
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!forwarded.ok) {
      return NextResponse.json({ error: "forwarder_rejected_event" }, { status: 502, headers: NO_STORE });
    }
  } catch {
    return NextResponse.json({ error: "forwarder_unavailable" }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({ received: true }, { status: 200, headers: NO_STORE });
}
