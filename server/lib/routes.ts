import { randomUUID } from "node:crypto";

import { config } from "./config";
import { sql } from "./db";
import { configured, digest, exchange, message, saveConnection, syncPage, unguessable } from "./instagram";
import { readSignedRequest } from "./meta-signed";
import { deleteObject, objectName, putObject } from "./storage";

/**
 * Routes that do not fit the kit's JSON actions: Meta's browser redirect and its form posts
 * (registered in the Meta app under /public/, so they skip the gateway login), and the image
 * upload, whose body is the file itself. Each returns null when the path is not its own.
 */

const PUBLIC_API = `${config.basePath}public/api`;
const log = (severity: string, event: string, fields: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ severity, app: config.appId, event, ...fields }));
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

export async function rawRoutes(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  if (path === `${PUBLIC_API}/instagram/callback` && req.method === "GET") return instagramCallback(req);
  if (path === `${PUBLIC_API}/instagram/deauthorize` && req.method === "POST") return deauthorize(req);
  if (path === `${PUBLIC_API}/instagram/data-deletion` && req.method === "POST") return dataDeletion(req);
  if (path === `${config.basePath}api/images` && req.method === "POST") return uploadImage(req);
  return null;
}

/**
 * Instagram sends the browser here after the login, in the pop-up. The result goes to the SPA's
 * /instagram-callback page, which reports to the editor window that opened the pop-up.
 */
async function instagramCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const hash = digest(url.searchParams.get("state") ?? "");
  const db = sql();
  const [saved] = await db<{ page_id: string | null; expires_at: Date }[]>`select page_id, expires_at from instagram_oauth_states where state_hash = ${hash}`;
  if (!saved || saved.expires_at.getTime() < Date.now()) return json({ error: "This connection request has expired." }, 400);
  await db`delete from instagram_oauth_states where state_hash = ${hash}`;
  const isNew = !saved.page_id;
  const back = new URL(`${config.appUrl()}/instagram-callback`);
  back.searchParams.set("mode", isNew ? "new" : "page");
  let returnPath = `${config.basePath}`;
  if (!isNew) {
    const [page] = await db<{ address: string }[]>`select address from pages where id = ${saved.page_id}`;
    returnPath = `${config.basePath}edit/${page?.address ?? ""}`;
  }
  try {
    if (url.searchParams.has("error")) throw new Error("Instagram permission was not granted.");
    if (!configured()) throw new Error("The Instagram app has not been set up yet.");
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Instagram did not return a connection code.");
    const result = await exchange(code);
    if (isNew) {
      // No page yet: park the connection under a one-time key the new-page dialog claims.
      const key = unguessable();
      await db`insert into instagram_pending_connections
        (key_hash, instagram_user_id, username, name, profile_picture_url, access_token, token_expires_at, expires_at)
        values (${digest(key)}, ${result.userId}, ${result.account.username}, ${result.account.name ?? ""},
          ${result.account.profile_picture_url ?? ""}, ${result.token}, ${result.expiresAt}, ${new Date(Date.now() + 3600000)})`;
      back.searchParams.set("key", key);
    } else {
      await saveConnection(saved.page_id!, { userId: result.userId, username: result.account.username, token: result.token, expiresAt: result.expiresAt });
      await syncPage(saved.page_id!);
    }
    log("INFO", "instagram.connected", { page_id: saved.page_id, new_page: isNew });
    back.searchParams.set("status", "ok");
  } catch (e) {
    log("WARNING", "instagram.connect_failed", { page_id: saved.page_id, error: message(e) });
    back.searchParams.set("status", "error");
    back.searchParams.set("reason", message(e).slice(0, 200));
  }
  back.searchParams.set("return", returnPath);
  return new Response(null, { status: 302, headers: { Location: back.toString(), "Cache-Control": "no-store" } });
}

/** Meta calls this when an account removes our app. Token and connection go; synced posts stay. */
async function deauthorize(req: Request): Promise<Response> {
  const data = await readSignedRequest(req).catch(() => null);
  if (!data) return json({ error: "Invalid signed_request" }, 400);
  const db = sql();
  await db`insert into instagram_disconnect_notices (page_id, reason)
    select page_id, 'deauthorized' from instagram_connections where instagram_user_id = ${data.user_id}
    on conflict (page_id) do update set reason = excluded.reason, created_at = now()`;
  await db`delete from instagram_connections where instagram_user_id = ${data.user_id}`;
  await db`delete from instagram_pending_connections where instagram_user_id = ${data.user_id}`;
  log("INFO", "instagram.deauthorized", {});
  return json({ success: true });
}

/** Meta calls this when someone asks for their data to be deleted: connection, token and synced posts go. */
async function dataDeletion(req: Request): Promise<Response> {
  const data = await readSignedRequest(req).catch(() => null);
  if (!data) return json({ error: "Invalid signed_request" }, 400);
  const db = sql();
  const rows = await db<{ page_id: string }[]>`select page_id from instagram_connections where instagram_user_id = ${data.user_id}`;
  const pageIds = rows.map((r) => r.page_id);
  if (pageIds.length) {
    const posts = await db<{ image_url: string }[]>`select image_url from instagram_posts where page_id = any(${pageIds})`;
    for (const p of posts) {
      const name = objectName(p.image_url);
      if (name) await deleteObject(name).catch(() => {});
    }
    await db`delete from instagram_posts where page_id = any(${pageIds})`;
    for (const pageId of pageIds) {
      await db`insert into instagram_disconnect_notices (page_id, reason) values (${pageId}, 'deleted')
        on conflict (page_id) do update set reason = 'deleted', created_at = now()`;
    }
  }
  await db`delete from instagram_connections where instagram_user_id = ${data.user_id}`;
  await db`delete from instagram_pending_connections where instagram_user_id = ${data.user_id}`;
  const code = randomUUID().replace(/-/g, "").slice(0, 16);
  log("INFO", "instagram.data_deleted", { pages: pageIds.length, confirmation_code: code });
  return json({ url: `${config.appUrl()}/public/data-deletion?code=${code}`, confirmation_code: code });
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg", "image/avif": "avif" };
const envelope = (data: unknown, error: { code: string; message: string } | null, status: number) =>
  Response.json({ data, error, meta: { requestId: randomUUID(), durationMs: 0 } }, { status });

/** The editor's image upload: the body is the file. Behind the gateway login, like every /api route. */
async function uploadImage(req: Request): Promise<Response> {
  const email = req.headers.get("X-Forwarded-Email");
  if (!email) return envelope(null, { code: "unauthorized", message: "Authentication required" }, 401);
  const type = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
  const ext = IMAGE_TYPES[type];
  if (!ext) return envelope(null, { code: "bad_request", message: "Only images can be uploaded." }, 400);
  const bytes = await req.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) return envelope(null, { code: "bad_request", message: "Images can be at most 5 MB." }, 400);
  try {
    const url = await putObject(`${randomUUID()}.${ext}`, bytes, type);
    log("INFO", "data.write.completed", { table: "images", bytes: bytes.byteLength, user: email });
    return envelope({ url }, null, 200);
  } catch (e) {
    log("ERROR", "external_api.failed", { provider: "cloud-storage", error: message(e) });
    return envelope(null, { code: "upstream_failed", message: "The image could not be stored." }, 502);
  }
}
