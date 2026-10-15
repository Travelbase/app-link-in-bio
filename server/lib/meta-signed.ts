import { createHmac, timingSafeEqual } from "node:crypto";

import { config } from "./config";

/** Verifies Meta's signed_request (HMAC-SHA256 with the Instagram app secret) and returns its payload. */
export async function readSignedRequest(req: Request): Promise<{ user_id: string } | null> {
  const secret = config.instagram.appSecret();
  if (!secret) return null;
  const type = req.headers.get("content-type") ?? "";
  const signed = type.includes("application/json")
    ? String(((await req.json()) as { signed_request?: string })?.signed_request ?? "")
    : String((await req.formData()).get("signed_request") ?? "");
  return verifySignedRequest(signed, secret);
}

export function verifySignedRequest(signed: string, secret: string): { user_id: string } | null {
  const [sig, payload] = signed.split(".");
  if (!sig || !payload) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data?.user_id ? { ...data, user_id: String(data.user_id) } : null;
  } catch {
    return null;
  }
}
