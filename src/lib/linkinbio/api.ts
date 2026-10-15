import { backend } from "./backend";
import type { BlockData, Market, PageData } from "./types";

// Data access goes through `backend` (see backend/types.ts); this file keeps the names the components use.

export type { PageSummary } from "./backend";

export const MARKETS: Market[] = ["NL", "BE", "FR", "DE", "UK"];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const fetchPageByAddress = (address: string) => backend.getPage(address);

/** All pages, most recently edited first, with the profile photo for the switcher. */
export const fetchPageSummaries = () => backend.listPages();

/** Saves the page settings and the full block list; returns the new updated_at. */
export const savePageAndBlocks = (page: PageData, blocks: BlockData[], removedIds: string[]) => backend.savePage(page, blocks, removedIds);

export const isAddressTaken = (address: string, exceptId?: string) => backend.isAddressTaken(address, exceptId);

/** Turns a handle into a free, valid address, adding -2, -3… when taken or reserved. */
export async function freeAddressFor(handle: string, suggest: (h: string) => string, formatError: (a: string) => string | null): Promise<string> {
  const base = suggest(handle) || "page";
  for (let i = 1; i < 100; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (!formatError(candidate) && !(await isAddressTaken(candidate))) return candidate;
  }
  throw new Error("No free web address found.");
}

export const fetchTemplateBlocks = (market: Market) => backend.templateBlocks(market);

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

export const createPageFromTemplate = (input: { handle: string; displayName: string; address: string; market: Market }) => backend.createPage(input);

export const deletePage = (id: string) => backend.deletePage(id);

/** Uploads an image with progress reporting; resolves to its public URL. */
export const uploadImage = (file: File, onProgress: (pct: number) => void) => backend.uploadImage(file, onProgress);
