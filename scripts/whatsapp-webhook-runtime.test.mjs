import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  constantTimeStringEqual, isValidForwardUrl, readBoundedBody, verifyMetaSignature,
} from "../apps/web/lib/whatsapp-webhook-security.mjs";

test("Meta HMAC verification accepts exact raw bytes and rejects tampering or weak secrets", () => {
  const secret = "test-app-secret-that-is-long-enough-123456";
  const body = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
  const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyMetaSignature(body, signature, secret), true);
  assert.equal(verifyMetaSignature(Buffer.from(body.toString() + " "), signature, secret), false);
  assert.equal(verifyMetaSignature(body, "sha256=invalid", secret), false);
  assert.equal(verifyMetaSignature(body, signature, "short"), false);
  assert.equal(verifyMetaSignature(body, signature, ""), false);
});

test("bounded body reader rejects declared and streamed oversized payloads", async () => {
  const declared = new Request("https://example.test/hook", { method: "POST", headers: { "content-length": "21" }, body: "x" });
  assert.deepEqual(await readBoundedBody(declared, 20), { ok: false, reason: "too_large" });
  const streamed = new Request("https://example.test/hook", { method: "POST", body: "x".repeat(21) });
  assert.deepEqual(await readBoundedBody(streamed, 20), { ok: false, reason: "too_large" });
  const valid = await readBoundedBody(new Request("https://example.test/hook", { method: "POST", body: "valid" }), 20);
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.body.toString(), "valid");
});

test("forwarding URL validator rejects non-HTTPS, credentialed, IP-literal, and local targets", () => {
  assert.equal(isValidForwardUrl("https://n8n.example.com/webhook/crestovia"), true);
  assert.equal(isValidForwardUrl("http://n8n.example.com/webhook"), false);
  assert.equal(isValidForwardUrl("https://user:pass@n8n.example.com/webhook"), false);
  assert.equal(isValidForwardUrl("https://127.0.0.1/webhook"), false);
  assert.equal(isValidForwardUrl("https://[::1]/webhook"), false);
  assert.equal(isValidForwardUrl("https://n8n.internal/webhook"), false);
  assert.equal(isValidForwardUrl("https://n8n.local/webhook"), false);
  assert.equal(isValidForwardUrl("not a URL"), false);
});

test("verification-token comparison rejects empty and unequal values", () => {
  assert.equal(constantTimeStringEqual("token-123", "token-123"), true);
  assert.equal(constantTimeStringEqual("token-123", "token-124"), false);
  assert.equal(constantTimeStringEqual("", ""), false);
});
