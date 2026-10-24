import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_BODY_BYTES = 1_000_000;

export async function readBoundedBody(request, maxBytes = MAX_BODY_BYTES) {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) return { ok: false, reason: "too_large" };
  if (!request.body) return { ok: true, body: Buffer.alloc(0) };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
    return { ok: true, body: Buffer.concat(chunks, total) };
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, reason: "read_failed" };
  } finally {
    reader.releaseLock();
  }
}

export function constantTimeStringEqual(actual, expected) {
  const left = Buffer.from(actual, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function isValidForwardUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const reservedSuffix = [".localhost", ".local", ".internal", ".test", ".invalid"];
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash &&
      hostname.includes(".") && hostname !== "localhost" && !reservedSuffix.some((suffix) => hostname.endsWith(suffix)) &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) && !hostname.startsWith("[");
  } catch { return false; }
}

export function verifyMetaSignature(body, signatureHeader, secret = process.env.WHATSAPP_APP_SECRET) {
  if (!secret || secret.length < 32 || !signatureHeader || !/^sha256=[0-9a-f]{64}$/i.test(signatureHeader)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const actual = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
