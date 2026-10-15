import type { Json } from "@/integrations/supabase/types";
import type { BlockData, Market, PageData } from "../types";
import type { LinkInBioBackend, SyncedPost } from "./types";

/**
 * Lovable Cloud (Supabase): the Lovable preview and staging. Tables straight from the browser,
 * Instagram through the edge functions in supabase/functions. No Bitly here.
 * The client is imported lazily so a production build never creates it.
 */
const db = async () => (await import("@/integrations/supabase/client")).supabase;

/** Which language version of the standard template each market starts from. */
const TEMPLATE_FOR: Record<Market, string> = { NL: "standard", BE: "standard", FR: "standard-fr", DE: "standard-de", UK: "standard-uk" };
const IMAGE_BUCKET = "page-images";

async function instagramConnect(body: Record<string, unknown>) {
  const supabase = await db();
  const { data, error } = await supabase.functions.invoke("instagram-connect", { body: { ...body, origin: window.location.origin } });
  if (data?.error) throw new Error(data.error);
  if (error) throw error;
  return data;
}

async function getPage(address: string) {
  const supabase = await db();
  const { data: page, error } = await supabase.from("pages").select("*").eq("address", address.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!page) return null;
  const { data: blocks, error: bErr } = await supabase.from("blocks").select("*").eq("page_id", page.id).order("position");
  if (bErr) throw bErr;
  return { page: page as unknown as PageData, blocks: (blocks ?? []) as unknown as BlockData[] };
}

async function instagramFeed(pageId: string): Promise<SyncedPost[] | null> {
  const status = await instagramConnect({ action: "status", pageId });
  if (!status?.connection) return null;
  const supabase = await db();
  const { data, error } = await supabase.from("instagram_posts").select("*").eq("page_id", pageId).order("posted_at", { ascending: false }).limit(24);
  if (error) throw error;
  return (data ?? []) as SyncedPost[];
}

export const supabaseBackend: LinkInBioBackend = {
  publicPage: getPage,
  publicFeed: instagramFeed,

  getPage,

  async listPages() {
    const supabase = await db();
    const { data, error } = await supabase
      .from("pages")
      .select("id,address,display_name,instagram_handle,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const { data: profiles } = await supabase.from("blocks").select("page_id,content").eq("type", "profile");
    const avatars = new Map((profiles ?? []).map((p) => [p.page_id, (p.content as { avatar_url?: string })?.avatar_url ?? null]));
    return (data ?? []).map((p) => ({ ...p, avatar_url: avatars.get(p.id) ?? null }));
  },

  async savePage(page, blocks, removedIds) {
    const supabase = await db();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, updated_at, created_at, ...fields } = page as PageData & { created_at?: string };
    const { data, error } = await supabase.from("pages").update(fields).eq("id", id!).select("updated_at").single();
    if (error) throw error;
    if (blocks.length) {
      const rows = blocks.map((b, i) => ({
        id: b.id!, page_id: id!, type: b.type, position: i, is_visible: b.is_visible, content: b.content as unknown as Json,
      }));
      const { error: bErr } = await supabase.from("blocks").upsert(rows);
      if (bErr) throw bErr;
    }
    if (removedIds.length) {
      const { error: dErr } = await supabase.from("blocks").delete().in("id", removedIds);
      if (dErr) throw dErr;
    }
    return data.updated_at;
  },

  async isAddressTaken(address, exceptId) {
    const supabase = await db();
    let q = supabase.from("pages").select("id").eq("address", address);
    if (exceptId) q = q.neq("id", exceptId);
    const { data, error } = await q.limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async templateBlocks(market) {
    const supabase = await db();
    const { data, error } = await supabase.from("page_templates").select("blocks").eq("key", TEMPLATE_FOR[market]).single();
    if (error) throw error;
    return (data.blocks as unknown as BlockData[]) ?? [];
  },

  async createPage(input) {
    const supabase = await db();
    const { data: tpl, error: tErr } = await supabase.from("page_templates").select("design,blocks").eq("key", TEMPLATE_FOR[input.market]).single();
    if (tErr) throw tErr;
    const design = tpl.design as Record<string, unknown>;
    const { data: page, error } = await supabase
      .from("pages")
      .insert({ ...design, address: input.address, instagram_handle: input.handle, display_name: input.displayName, market: input.market })
      .select("id,address")
      .single();
    if (error) throw error;
    const tplBlocks = (tpl.blocks as unknown as BlockData[]) ?? [];
    const rows = tplBlocks.map((b, i) => {
      let content = structuredClone(b.content) as Record<string, unknown>;
      if (b.type === "profile") content = { ...content, name: input.displayName, avatar_url: "", avatar_custom: false };
      if (b.type === "social_icons") {
        const items = (content.items as { platform: string; url: string }[]) ?? [];
        content = { ...content, items: items.map((it) => (it.platform === "instagram" ? { ...it, url: `https://instagram.com/${input.handle}` } : it)) };
      }
      return { page_id: page.id, type: b.type, position: i, is_visible: b.is_visible ?? true, content: content as Json };
    });
    if (rows.length) {
      const { error: bErr } = await supabase.from("blocks").insert(rows);
      if (bErr) throw bErr;
    }
    return { id: page.id, address: page.address };
  },

  async deletePage(id) {
    const supabase = await db();
    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadImage(file, onProgress) {
    const supabase = await db();
    const base = import.meta.env.VITE_SUPABASE_URL as string;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext}`;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${base}/storage/v1/object/${IMAGE_BUCKET}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${key}`);
      xhr.setRequestHeader("apikey", key);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
        } else reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  },

  instagramFeed,

  instagram: (action, pageId) => instagramConnect({ action, pageId }),

  async updateSyncedPost(id, patch) {
    const supabase = await db();
    const { error } = await supabase.from("instagram_posts").update(patch).eq("id", id);
    if (error) throw error;
  },

  instagramConfigured: async () => !!(await instagramConnect({ action: "configured" }))?.configured,
  startNewPageInstagram: () => instagramConnect({ action: "start_new" }),
  pendingProfile: (key) => instagramConnect({ action: "pending_profile", key }),
  claimPending: (key, pageId) => instagramConnect({ action: "claim_pending", key, pageId }),

  shortLink: async () => null,
  linkStats: async () => null,
};
