import { ApiError, badRequest, defineAction, notFound, upstreamFailed, z } from "@travelbase/app-api-kit";

import { sql } from "../lib/db";
import { authorizeUrl, configured, digest, message, saveConnection, syncAvatar, syncPage } from "../lib/instagram";

/** The editor's Instagram actions: connect, sync, disconnect, and the synced posts. */

const SyncedPost = z.object({
  id: z.string(), page_id: z.string(), instagram_media_id: z.string(), media_type: z.string(), caption: z.string(),
  permalink: z.string(), posted_at: z.string(), image_url: z.string(), link_url: z.string(), is_hidden: z.boolean(), position: z.number(),
});
const Connection = z.object({ username: z.string(), last_synced_at: z.string().nullable(), last_error: z.string().nullable() });

const notSetUp = () => new ApiError("not_configured", "The Instagram app has not been set up yet.", 503);
const iso = (d: Date | null) => (d ? d.toISOString() : null);

async function connectionOf(pageId: string) {
  const [c] = await sql()<{ username: string; last_synced_at: Date | null; last_error: string | null }[]>`
    select username, last_synced_at, last_error from instagram_connections where page_id = ${pageId}`;
  return c ? { username: c.username, last_synced_at: iso(c.last_synced_at), last_error: c.last_error } : null;
}

export const instagramFeed = defineAction({
  name: "instagramFeed",
  method: "get",
  path: "/instagram/feed",
  summary: "The synced posts of a page; null when Instagram is not connected",
  tags: ["instagram"],
  input: z.object({ pageId: z.string().uuid() }),
  output: z.object({ posts: z.array(SyncedPost).nullable() }),
  handler: async ({ pageId }) => ({ posts: await feedOf(pageId) }),
});

export async function feedOf(pageId: string) {
  if (!(await connectionOf(pageId))) return null;
  const rows = await sql()<Record<string, any>[]>`
    select * from instagram_posts where page_id = ${pageId} order by posted_at desc limit 24`;
  return rows.map((r) => ({
    id: r.id, page_id: r.page_id, instagram_media_id: r.instagram_media_id, media_type: r.media_type, caption: r.caption,
    permalink: r.permalink, posted_at: r.posted_at.toISOString(), image_url: r.image_url, link_url: r.link_url,
    is_hidden: r.is_hidden, position: r.position,
  }));
}

export const instagram = defineAction({
  name: "instagram",
  method: "post",
  path: "/instagram",
  summary: "Status, connect, sync or disconnect the Instagram account of a page",
  description: "`start` returns Instagram's login URL; the login ends at /public/api/instagram/callback.",
  tags: ["instagram"],
  input: z.object({ action: z.enum(["status", "start", "sync", "disconnect"]), pageId: z.string().uuid() }),
  output: z.object({
    configured: z.boolean().optional(), revoked: z.boolean().optional(), connection: Connection.nullable().optional(),
    url: z.string().optional(), ok: z.boolean().optional(),
  }),
  handler: async ({ action, pageId }, ctx) => {
    const db = sql();
    const [page] = await db`select id from pages where id = ${pageId}`;
    if (!page) throw notFound("Page not found");
    if (action === "status") {
      const connection = await connectionOf(pageId);
      const [notice] = await db`select reason from instagram_disconnect_notices where page_id = ${pageId}`;
      return { configured: configured(), connection, revoked: !connection && !!notice };
    }
    if (action === "start") {
      if (!configured()) throw notSetUp();
      return { url: await authorizeUrl(pageId) };
    }
    if (action === "sync") {
      try {
        await syncPage(pageId);
      } catch (e) {
        throw upstreamFailed(message(e));
      }
      ctx.log("data.sync.completed", { page_id: pageId });
      return { ok: true };
    }
    await db`delete from instagram_connections where page_id = ${pageId}`;
    ctx.log("data.write.completed", { records_deleted: 1, table: "instagram_connections", page_id: pageId, user: ctx.email });
    return { ok: true };
  },
});

export const updateSyncedPost = defineAction({
  name: "updateSyncedPost",
  method: "post",
  path: "/instagram/post",
  summary: "Change the link or visibility of a synced post",
  tags: ["instagram"],
  input: z.object({ id: z.string().uuid(), link_url: z.string().optional(), is_hidden: z.boolean().optional() }),
  output: z.object({ ok: z.literal(true) }),
  handler: async ({ id, ...patch }) => {
    const fields = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(fields).length) throw badRequest("Nothing to change");
    await sql()`update instagram_posts set ${sql()(fields as never)} where id = ${id}`;
    return { ok: true as const };
  },
});

export const instagramConfigured = defineAction({
  name: "instagramConfigured",
  method: "get",
  path: "/instagram/configured",
  summary: "Whether the Instagram app ID and secret are set",
  tags: ["instagram"],
  input: z.object({}),
  output: z.object({ configured: z.boolean() }),
  handler: () => ({ configured: configured() }),
});

export const startNewPageInstagram = defineAction({
  name: "startNewPageInstagram",
  method: "post",
  path: "/instagram/start-new",
  summary: "Instagram login for a page that does not exist yet",
  description: "The callback parks the connection under a one-time key that the new-page dialog claims.",
  tags: ["instagram"],
  input: z.object({}),
  output: z.object({ url: z.string() }),
  handler: async () => {
    if (!configured()) throw notSetUp();
    return { url: await authorizeUrl(null) };
  },
});

async function pendingByKey(key: string) {
  if (key.length < 60) throw badRequest("Invalid request");
  const [pending] = await sql()<Record<string, any>[]>`select * from instagram_pending_connections where key_hash = ${digest(key)}`;
  if (!pending || new Date(pending.expires_at).getTime() < Date.now()) {
    throw new ApiError("expired", "This Instagram login has expired. Please connect again.", 410);
  }
  return pending;
}

export const pendingProfile = defineAction({
  name: "pendingProfile",
  method: "post",
  path: "/instagram/pending",
  summary: "The Instagram profile behind a pending login",
  tags: ["instagram"],
  input: z.object({ key: z.string() }),
  output: z.object({ username: z.string(), name: z.string(), profile_picture_url: z.string() }),
  handler: async ({ key }) => {
    const p = await pendingByKey(key);
    return { username: p.username, name: p.name, profile_picture_url: p.profile_picture_url };
  },
});

export const claimPending = defineAction({
  name: "claimPending",
  method: "post",
  path: "/instagram/claim",
  summary: "Attach a pending Instagram login to the page just created, and sync it",
  tags: ["instagram"],
  input: z.object({ key: z.string(), pageId: z.string().uuid() }),
  output: z.object({ ok: z.boolean(), syncError: z.string().optional() }),
  handler: async ({ key, pageId }, ctx) => {
    const p = await pendingByKey(key);
    await saveConnection(pageId, { userId: p.instagram_user_id, username: p.username, token: p.access_token, expiresAt: p.token_expires_at });
    await sql()`delete from instagram_pending_connections where key_hash = ${digest(key)}`;
    ctx.log("data.write.completed", { records_written: 1, table: "instagram_connections", page_id: pageId, user: ctx.email });
    await syncAvatar(pageId, p.profile_picture_url).catch(() => {});
    try {
      await syncPage(pageId);
    } catch (e) {
      return { ok: true, syncError: message(e) };
    }
    return { ok: true };
  },
});
