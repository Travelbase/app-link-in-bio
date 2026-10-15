import { createHash, randomUUID } from "node:crypto";

import { config } from "./config";
import { sql } from "./db";
import { putObject } from "./storage";

/**
 * Instagram API with Instagram Login (scope instagram_business_basic), ported from the Lovable
 * edge functions in supabase/functions. Tokens stay in the database and never reach the browser.
 */

export const configured = () => Boolean(config.instagram.appId() && config.instagram.appSecret());
export const callbackUrl = () => `${config.appUrl()}/public/api/instagram/callback`;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const unguessable = () => randomUUID() + randomUUID();
export const message = (error: unknown) => (error instanceof Error ? error.message : "Instagram connection failed.");

type PostRow = {
  page_id: string; instagram_media_id: string; media_type: string; caption: string; permalink: string;
  posted_at: Date; image_url: string; position: number; link_url: string; is_hidden: boolean;
};

type Connection = {
  page_id: string;
  instagram_user_id: string;
  username: string;
  access_token: string;
  token_issued_at: Date;
  token_expires_at: Date;
};

export async function graph(path: string, token: string) {
  const url = new URL(`https://graph.instagram.com/${path}`);
  url.searchParams.set("access_token", token);
  const response = await fetch(url);
  const data = (await response.json()) as Record<string, any>;
  if (!response.ok || data.error) throw new Error(data.error?.message ?? "Instagram could not be reached.");
  return data;
}

/** Instagram's login page for a new connection; `pageId` null means the page does not exist yet. */
export async function authorizeUrl(pageId: string | null): Promise<string> {
  const state = unguessable();
  await sql()`insert into instagram_oauth_states (state_hash, page_id, return_origin, expires_at)
    values (${digest(state)}, ${pageId}, ${config.appUrl()}, ${new Date(Date.now() + 10 * 60000)})`;
  const authorize = new URL("https://www.instagram.com/oauth/authorize");
  authorize.search = new URLSearchParams({
    client_id: config.instagram.appId(),
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: "instagram_business_basic",
    state,
    force_reauth: "true",
  }).toString();
  return authorize.toString();
}

/** Trades the login code for a long-lived token and the account behind it. */
export async function exchange(code: string) {
  const body = new URLSearchParams({
    client_id: config.instagram.appId(),
    client_secret: config.instagram.appSecret(),
    grant_type: "authorization_code",
    redirect_uri: callbackUrl(),
    code,
  });
  const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body });
  const short = (await shortResponse.json()) as Record<string, any>;
  if (!shortResponse.ok || !short.access_token) throw new Error(short.error_message ?? "Instagram could not authorize this account.");
  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", config.instagram.appSecret());
  longUrl.searchParams.set("access_token", short.access_token);
  const longResponse = await fetch(longUrl);
  const long = (await longResponse.json()) as Record<string, any>;
  if (!longResponse.ok || !long.access_token) throw new Error(long.error?.message ?? "Instagram could not issue a long-lived connection.");
  const account = await graph("me?fields=user_id,username,name,profile_picture_url", long.access_token);
  return {
    token: long.access_token as string,
    expiresAt: new Date(Date.now() + long.expires_in * 1000),
    account,
    userId: String(account.user_id ?? short.user_id),
  };
}

export async function saveConnection(pageId: string, c: { userId: string; username: string; token: string; expiresAt: Date }) {
  await sql()`insert into instagram_connections (page_id, instagram_user_id, username, access_token, token_issued_at, token_expires_at, last_error)
    values (${pageId}, ${c.userId}, ${c.username}, ${c.token}, now(), ${c.expiresAt}, null)
    on conflict (page_id) do update set instagram_user_id = excluded.instagram_user_id, username = excluded.username,
      access_token = excluded.access_token, token_issued_at = now(), token_expires_at = excluded.token_expires_at, last_error = null`;
  await sql()`delete from instagram_disconnect_notices where page_id = ${pageId}`;
}

/** Long-lived tokens last 60 days; renew after 50. */
async function refresh(connection: Connection): Promise<Connection> {
  if (Date.now() - new Date(connection.token_issued_at).getTime() < 50 * 86400000) return connection;
  const data = await graph("refresh_access_token?grant_type=ig_refresh_token", connection.access_token);
  const updated = { ...connection, access_token: data.access_token, token_issued_at: new Date(), token_expires_at: new Date(Date.now() + data.expires_in * 1000) };
  await sql()`update instagram_connections set access_token = ${updated.access_token}, token_issued_at = ${updated.token_issued_at},
    token_expires_at = ${updated.token_expires_at} where page_id = ${connection.page_id}`;
  return updated;
}

const suggestedLink = (caption: string) => {
  const match = caption.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i);
  if (!match) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(match[0]) ? match[0] : `https://${match[0]}`);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

/** Copies an image from Instagram into the image bucket at a fixed name; returns its public URL. */
export async function copyImage(source: string, name: string) {
  const image = await fetch(source);
  if (!image.ok) throw new Error("Instagram image could not be copied.");
  const bytes = await image.arrayBuffer();
  const contentType = image.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  if (!contentType.startsWith("image/") || bytes.byteLength > 10 * 1024 * 1024) throw new Error("Instagram image is not a supported size or format.");
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return putObject(`${name}.${extension}`, bytes, contentType);
}

/** Puts the Instagram profile picture on the page's Profile block, unless the team uploaded its own. */
export async function syncAvatar(pageId: string, pictureUrl: string) {
  if (!pictureUrl) return;
  const [block] = await sql()<{ id: string; content: Record<string, unknown> }[]>`
    select id, content from blocks where page_id = ${pageId} and type = 'profile' limit 1`;
  if (!block || block.content?.avatar_custom) return;
  const url = await copyImage(pictureUrl, `instagram/${pageId}/avatar`);
  const content = { ...block.content, avatar_url: `${url}?v=${Date.now()}`, avatar_custom: false };
  await sql()`update blocks set content = ${sql().json(content as never)} where id = ${block.id}`;
}

/** Pulls the latest 24 posts into instagram_posts, keeping links and hidden flags the team set. */
export async function syncPage(pageId: string) {
  const db = sql();
  const [raw] = await db<Connection[]>`select * from instagram_connections where page_id = ${pageId}`;
  if (!raw) throw new Error("Instagram is not connected.");
  try {
    const connection = await refresh(raw);
    try {
      const me = await graph("me?fields=profile_picture_url", connection.access_token);
      await syncAvatar(pageId, me.profile_picture_url ?? "");
    } catch {
      /* avatar is best effort; the feed sync continues */
    }
    const data = await graph("me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24", connection.access_token);
    const media = ((data.data ?? []) as Record<string, any>[]).filter((m) => ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].includes(m.media_type));
    const previous = await db<{ instagram_media_id: string; link_url: string; is_hidden: boolean; image_url: string }[]>`
      select instagram_media_id, link_url, is_hidden, image_url from instagram_posts where page_id = ${pageId}`;
    const old = new Map(previous.map((p) => [p.instagram_media_id, p]));
    // Links from the manual grid (e.g. imported from Later), matched by Instagram media id.
    const [grid] = await db<{ content: Record<string, any> }[]>`select content from blocks where page_id = ${pageId} and type = 'instagram_grid' limit 1`;
    const manualLinks = new Map<string, string>();
    for (const p of grid?.content?.posts ?? []) if (p?.instagram_media_id && p?.url) manualLinks.set(String(p.instagram_media_id), p.url);
    const rows: PostRow[] = [];
    for (const [position, post] of media.entries()) {
      const prior = old.get(post.id);
      let imageUrl = prior?.image_url ?? "";
      // Existing copies are stable; only download newly seen media.
      if (!imageUrl) {
        const source = post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url || post.thumbnail_url;
        if (!source) continue;
        imageUrl = await copyImage(source, `instagram/${pageId}/${post.id}`);
      }
      rows.push({
        page_id: pageId,
        instagram_media_id: String(post.id),
        media_type: post.media_type,
        caption: post.caption ?? "",
        permalink: post.permalink ?? "",
        posted_at: new Date(post.timestamp),
        image_url: imageUrl,
        position,
        link_url: prior ? prior.link_url : manualLinks.get(String(post.id)) || suggestedLink(post.caption ?? ""),
        is_hidden: prior?.is_hidden ?? false,
      });
    }
    await db.begin(async (tx) => {
      if (rows.length) {
        await tx`insert into instagram_posts ${tx(rows)}
          on conflict (instagram_media_id) do update set page_id = excluded.page_id, media_type = excluded.media_type,
            caption = excluded.caption, permalink = excluded.permalink, posted_at = excluded.posted_at,
            image_url = excluded.image_url, position = excluded.position, link_url = excluded.link_url, is_hidden = excluded.is_hidden`;
      }
      const keep = rows.map((r) => r.instagram_media_id);
      await tx`delete from instagram_posts where page_id = ${pageId} and not (instagram_media_id = any(${keep}))`;
      await tx`update instagram_connections set last_synced_at = now(), last_error = null where page_id = ${pageId}`;
    });
  } catch (e) {
    await db`update instagram_connections set last_error = ${e instanceof Error ? e.message.slice(0, 500) : "Sync failed"} where page_id = ${pageId}`;
    throw e;
  }
}
