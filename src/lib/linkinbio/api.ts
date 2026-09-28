import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { BlockData, Market, PageData } from "./types";

export const MARKETS: Market[] = ["NL", "BE", "FR", "DE", "UK"];
/** Which language version of the standard template each market starts from. */
const TEMPLATE_FOR: Record<Market, string> = { NL: "standard", BE: "standard", FR: "standard-fr", DE: "standard-de", UK: "standard-uk" };

export const IMAGE_BUCKET = "page-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function fetchPageByAddress(address: string): Promise<{ page: PageData; blocks: BlockData[] } | null> {
  const { data: page, error } = await supabase.from("pages").select("*").eq("address", address.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!page) return null;
  const { data: blocks, error: bErr } = await supabase.from("blocks").select("*").eq("page_id", page.id).order("position");
  if (bErr) throw bErr;
  return { page: page as unknown as PageData, blocks: (blocks ?? []) as unknown as BlockData[] };
}

export interface PageSummary {
  id: string;
  address: string;
  display_name: string;
  instagram_handle: string;
  updated_at: string;
  avatar_url: string | null;
}

/** All pages, most recently edited first, with the profile photo for the switcher. */
export async function fetchPageSummaries(): Promise<PageSummary[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id,address,display_name,instagram_handle,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const { data: profiles } = await supabase.from("blocks").select("page_id,content").eq("type", "profile");
  const avatars = new Map((profiles ?? []).map((p) => [p.page_id, (p.content as { avatar_url?: string })?.avatar_url ?? null]));
  return (data ?? []).map((p) => ({ ...p, avatar_url: avatars.get(p.id) ?? null }));
}

/** Saves the page settings and the full block list; returns the new updated_at. */
export async function savePageAndBlocks(page: PageData, blocks: BlockData[], removedIds: string[]): Promise<string> {
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
}

export async function isAddressTaken(address: string, exceptId?: string): Promise<boolean> {
  let q = supabase.from("pages").select("id").eq("address", address);
  if (exceptId) q = q.neq("id", exceptId);
  const { data, error } = await q.limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Turns a handle into a free, valid address, adding -2, -3… when taken or reserved. */
export async function freeAddressFor(handle: string, suggest: (h: string) => string, formatError: (a: string) => string | null): Promise<string> {
  const base = suggest(handle) || "page";
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (!formatError(candidate) && !(await isAddressTaken(candidate))) return candidate;
  }
  throw new Error("No free web address found.");
}

export async function fetchTemplateBlocks(market: Market): Promise<BlockData[]> {
  const { data, error } = await supabase.from("page_templates").select("blocks").eq("key", TEMPLATE_FOR[market]).single();
  if (error) throw error;
  return (data.blocks as unknown as BlockData[]) ?? [];
}

/** Replaces template example texts that still match the old market's template with the new market's texts. */
export function swapTemplateTexts(blocks: BlockData[], from: BlockData[], to: BlockData[]): { blocks: BlockData[]; changed: number } {
  let changed = 0;
  const pick = (list: BlockData[], type: string) => list.find((b) => b.type === type)?.content as Record<string, any> | undefined;
  const swap = (cur: Record<string, any>, a: Record<string, any> | undefined, b: Record<string, any> | undefined, fields: string[]) => {
    const next = { ...cur };
    if (!a || !b) return next;
    for (const f of fields) if (cur[f] && cur[f] === a[f] && a[f] !== b[f]) { next[f] = b[f]; changed++; }
    return next;
  };
  const out = blocks.map((blk) => {
    const a = pick(from, blk.type), b = pick(to, blk.type);
    const c = blk.content as Record<string, any>;
    let content: Record<string, any> = c;
    if (blk.type === "profile") content = swap(c, a, b, ["tagline"]);
    else if (blk.type === "featured_banner") content = swap(c, a, b, ["title", "button_label"]);
    else if (blk.type === "button") content = swap(c, a, b, ["label"]);
    else if (blk.type === "carousel") content = { ...c, items: (c.items ?? []).map((it: Record<string, any>, i: number) => swap(it, a?.items?.[i], b?.items?.[i], ["title", "subtitle"])) };
    return { ...blk, content } as BlockData;
  });
  return { blocks: out, changed };
}

export async function createPageFromTemplate(input: { handle: string; displayName: string; address: string; market: Market }): Promise<{ id: string; address: string }> {
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
}

export async function deletePage(id: string) {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw error;
}

/** Uploads an image with progress reporting; resolves to its public URL. */
export function uploadImage(file: File, onProgress: (pct: number) => void): Promise<string> {
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
}
