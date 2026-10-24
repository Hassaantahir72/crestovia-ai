export const MAX_BODY_BYTES: number;
export type BoundedBodyResult = { ok: true; body: Buffer } | { ok: false; reason: "too_large" | "read_failed" };
export function readBoundedBody(request: Request, maxBytes?: number): Promise<BoundedBodyResult>;
export function constantTimeStringEqual(actual: string, expected: string): boolean;
export function isValidForwardUrl(value: string): boolean;
export function verifyMetaSignature(body: Buffer, signatureHeader: string | null, secret?: string): boolean;
