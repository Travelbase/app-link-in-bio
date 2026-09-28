// Verifies Meta's signed_request (HMAC-SHA256 with the app secret) and returns its payload.
const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

export async function readSignedRequest(req: Request): Promise<Record<string, any> | null> {
  const secret = Deno.env.get('INSTAGRAM_APP_SECRET');
  if (!secret) return null;
  let signed = '';
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) signed = (await req.json())?.signed_request ?? '';
  else signed = String((await req.formData()).get('signed_request') ?? '');
  const [sig, payload] = signed.split('.');
  if (!sig || !payload) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, b64url(sig), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64url(payload)));
    return data?.user_id ? data : null;
  } catch { return null; }
}
