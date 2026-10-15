import { ApiError, defineAction, notFound, z } from "@travelbase/app-api-kit";

import { ensureShortLink } from "../lib/bitly";
import { sql } from "../lib/db";

/**
 * Pages, blocks and templates for the editor. Page and block objects keep their database
 * column names (snake_case): the frontend shares one shape with the Lovable (Supabase) backend.
 */

const MARKETS = ["NL", "BE", "FR", "DE", "UK"] as const;
/** Which language version of the standard template each market starts from. */
const TEMPLATE_FOR: Record<(typeof MARKETS)[number], string> = { NL: "standard", BE: "standard", FR: "standard-fr", DE: "standard-de", UK: "standard-uk" };

/** Page columns the editor may write. */
const PAGE_FIELDS = [
  "address", "instagram_handle", "display_name", "background_type", "background_color", "background_image_url", "text_color",
  "font", "block_color", "block_text_color", "block_shape", "block_style", "block_shadow", "button_accent_color",
  "footer_logo_url", "market", "show_travelbase_logo", "brand_code",
] as const;

const Page = z.object({ id: z.string().uuid(), address: z.string() }).passthrough();
const Block = z.object({
  id: z.string().uuid(),
  type: z.string(),
  position: z.number().int(),
  is_visible: z.boolean(),
  content: z.record(z.unknown()),
}).passthrough();
const PageWithBlocks = z.object({ page: Page, blocks: z.array(Block) });

type Draft = { page: Record<string, unknown>; blocks: z.infer<typeof Block>[] };

/** The live page and blocks: what visitors see. Never the draft. */
export async function loadPage(address: string) {
  const db = sql();
  const [row] = await db`select * from pages where address = ${address.toLowerCase()}`;
  if (!row) return null;
  const { draft: _draft, ...page } = row;
  const blocks = await db`select * from blocks where page_id = ${page.id} order by position`;
  return { page, blocks } as unknown as z.infer<typeof PageWithBlocks>;
}

/** The page as the editor works on it: the draft over the live rows, when there is one. */
export async function loadEditorPage(address: string) {
  const live = await loadPage(address);
  if (!live) return null;
  const [{ draft }] = await sql()<{ draft: Draft | null }[]>`select draft from pages where id = ${live.page.id}`;
  const liveAddress = live.page.address;
  if (!draft) return { ...live, hasDraft: false, liveAddress };
  return { page: { ...live.page, ...draft.page, id: live.page.id }, blocks: draft.blocks, hasDraft: true, liveAddress } as typeof live & { hasDraft: boolean; liveAddress: string };
}

/** A unique-violation on pages.address, as the code the editor recognises. */
const addressTaken = (error: unknown) => {
  if ((error as { code?: string })?.code === "23505" && String((error as Error).message).includes("address")) {
    return new ApiError("address_taken", "That web address is already taken.", 409);
  }
  return error;
};

export const listPages = defineAction({
  name: "listPages",
  method: "get",
  path: "/pages",
  summary: "All pages, most recently edited first, with the profile photo",
  tags: ["pages"],
  input: z.object({}),
  output: z.array(z.object({
    id: z.string(), address: z.string(), display_name: z.string(), instagram_handle: z.string(),
    updated_at: z.string(), avatar_url: z.string().nullable(),
  })),
  handler: async () => {
    const rows = await sql()<{ id: string; address: string; display_name: string; instagram_handle: string; updated_at: Date; avatar_url: string | null }[]>`
      select p.id, p.address, p.display_name, p.instagram_handle, p.updated_at, b.content->>'avatar_url' as avatar_url
      from pages p left join lateral (select content from blocks where page_id = p.id and type = 'profile' limit 1) b on true
      order by p.updated_at desc`;
    return rows.map((r) => ({ ...r, updated_at: r.updated_at.toISOString() }));
  },
});

export const getPage = defineAction({
  name: "getPage",
  method: "get",
  path: "/page",
  summary: "One page with its blocks as the editor sees them (draft when there is one), by address",
  tags: ["pages"],
  input: z.object({ address: z.string() }),
  output: PageWithBlocks.extend({ hasDraft: z.boolean(), liveAddress: z.string() }).nullable(),
  handler: async ({ address }) => loadEditorPage(address),
});

export const savePage = defineAction({
  name: "savePage",
  method: "post",
  path: "/page/save",
  summary: "Save the page settings and its whole block list as the page's draft",
  description: "Visitors keep seeing the live page until publishPage. removedIds is ignored: the draft holds the full list. Returns the page's new updated_at.",
  tags: ["pages"],
  input: z.object({ page: Page, blocks: z.array(Block), removedIds: z.array(z.string().uuid()).optional() }),
  output: z.object({ updatedAt: z.string() }),
  handler: async ({ page, blocks }, ctx) => {
    const fields = Object.fromEntries(PAGE_FIELDS.filter((f) => f in page).map((f) => [f, (page as Record<string, unknown>)[f]]));
    const db = sql();
    if (typeof fields.address === "string") {
      const [other] = await db`select 1 from pages where address = ${fields.address} and id <> ${page.id} limit 1`;
      if (other) throw new ApiError("address_taken", "That web address is already taken.", 409);
    }
    const draft: Draft = { page: fields, blocks: blocks.map(({ id, type, position, is_visible, content }) => ({ id, type, position, is_visible, content })) };
    const [row] = await db<{ updated_at: Date }[]>`update pages set draft = ${db.json(draft as never)} where id = ${page.id} returning updated_at`;
    if (!row) throw notFound("Page not found");
    ctx.log("data.write.completed", { records_written: 1, page_id: page.id, user: ctx.email });
    return { updatedAt: row.updated_at.toISOString() };
  },
});

export const publishPage = defineAction({
  name: "publishPage",
  method: "post",
  path: "/page/publish",
  summary: "Make the page's draft live",
  description: "Writes the draft to the page and blocks visitors read, deletes blocks the draft no longer has, and clears the draft.",
  tags: ["pages"],
  input: z.object({ id: z.string().uuid() }),
  output: z.object({ publishedAt: z.string() }),
  handler: async ({ id }, ctx) => {
    let written = 0;
    const publishedAt = await sql().begin(async (tx) => {
      const [row] = await tx<{ draft: Draft | null; published_at: Date }[]>`select draft, published_at from pages where id = ${id} for update`;
      if (!row) throw notFound("Page not found");
      if (!row.draft) return row.published_at;
      const fields = Object.fromEntries(PAGE_FIELDS.filter((f) => f in row.draft!.page).map((f) => [f, row.draft!.page[f]]));
      if (Object.keys(fields).length) await tx`update pages set ${tx(fields as never)} where id = ${id}`;
      for (const b of row.draft.blocks) {
        await tx`insert into blocks (id, page_id, type, position, is_visible, content)
          values (${b.id}, ${id}, ${b.type}, ${b.position}, ${b.is_visible}, ${tx.json(b.content as never)})
          on conflict (id) do update set type = excluded.type, position = excluded.position,
            is_visible = excluded.is_visible, content = excluded.content
          where blocks.page_id = ${id}`;
      }
      await tx`delete from blocks where page_id = ${id} and not (id = any(${row.draft.blocks.map((b) => b.id)}::uuid[]))`;
      const [done] = await tx<{ published_at: Date }[]>`update pages set draft = null, published_at = now() where id = ${id} returning published_at`;
      written = row.draft.blocks.length + 1;
      return done!.published_at;
    }).catch((e) => { throw addressTaken(e); });
    if (written) ctx.log("data.write.completed", { records_written: written, page_id: id, user: ctx.email, action: "publish" });
    return { publishedAt: publishedAt.toISOString() };
  },
});

export const discardDraft = defineAction({
  name: "discardDraft",
  method: "post",
  path: "/page/discard",
  summary: "Throw away the page's draft; the editor goes back to the live page",
  tags: ["pages"],
  input: z.object({ id: z.string().uuid() }),
  output: z.object({ ok: z.literal(true) }),
  handler: async ({ id }, ctx) => {
    await sql()`update pages set draft = null where id = ${id} and draft is not null`;
    ctx.log("data.write.completed", { records_written: 1, page_id: id, user: ctx.email, action: "discard_draft" });
    return { ok: true as const };
  },
});

export const addressTakenAction = defineAction({
  name: "addressTaken",
  method: "get",
  path: "/address-taken",
  summary: "Whether another page already uses this address",
  tags: ["pages"],
  input: z.object({ address: z.string(), exceptId: z.string().uuid().optional() }),
  output: z.object({ taken: z.boolean() }),
  handler: async ({ address, exceptId }) => {
    const rows = exceptId
      ? await sql()`select 1 from pages where address = ${address} and id <> ${exceptId} limit 1`
      : await sql()`select 1 from pages where address = ${address} limit 1`;
    return { taken: rows.length > 0 };
  },
});

export const templateBlocks = defineAction({
  name: "templateBlocks",
  method: "get",
  path: "/template",
  summary: "The blocks of the standard template for a market",
  tags: ["pages"],
  input: z.object({ market: z.enum(MARKETS) }),
  output: z.array(z.record(z.unknown())),
  handler: async ({ market }) => {
    const [tpl] = await sql()<{ blocks: Record<string, unknown>[] }[]>`select blocks from page_templates where key = ${TEMPLATE_FOR[market]}`;
    if (!tpl) throw notFound("Template not found");
    return tpl.blocks ?? [];
  },
});

export const createPage = defineAction({
  name: "createPage",
  method: "post",
  path: "/page/create",
  summary: "Create a page from the standard template of its market",
  description: "Also asks Bitly for the page's short link; a Bitly failure does not stop the page.",
  tags: ["pages"],
  input: z.object({ handle: z.string(), displayName: z.string().min(1), address: z.string(), market: z.enum(MARKETS) }),
  output: z.object({ id: z.string(), address: z.string() }),
  handler: async (input, ctx) => {
    const db = sql();
    const [tpl] = await db<{ design: Record<string, unknown>; blocks: { type: string; is_visible?: boolean; content: Record<string, unknown> }[] }[]>`
      select design, blocks from page_templates where key = ${TEMPLATE_FOR[input.market]}`;
    if (!tpl) throw notFound("Template not found");
    const design = Object.fromEntries(Object.entries(tpl.design).filter(([k]) => (PAGE_FIELDS as readonly string[]).includes(k)));
    const page = await db.begin(async (tx) => {
      const [created] = await tx<{ id: string; address: string }[]>`insert into pages ${tx({
        ...design, address: input.address, instagram_handle: input.handle, display_name: input.displayName, market: input.market,
      } as never)} returning id, address`;
      for (const [i, b] of (tpl.blocks ?? []).entries()) {
        let content = structuredClone(b.content);
        if (b.type === "profile") content = { ...content, name: input.displayName, avatar_url: "", avatar_custom: false };
        if (b.type === "social_icons") {
          const items = (content.items as { platform: string; url: string }[]) ?? [];
          content = { ...content, items: items.map((it) => (it.platform === "instagram" ? { ...it, url: `https://instagram.com/${input.handle}` } : it)) };
        }
        await tx`insert into blocks (page_id, type, position, is_visible, content)
          values (${created!.id}, ${b.type}, ${i}, ${b.is_visible ?? true}, ${tx.json(content as never)})`;
      }
      return created!;
    }).catch((e) => { throw addressTaken(e); });
    ctx.log("data.write.completed", { records_written: 1, page_id: page.id, user: ctx.email });
    await ensureShortLink(page.id, ctx.log).catch((error) => ctx.log("external_api.failed", { provider: "bitly", error: String(error) }));
    return page;
  },
});

export const deletePage = defineAction({
  name: "deletePage",
  method: "post",
  path: "/page/delete",
  summary: "Delete a page with its blocks and Instagram data",
  tags: ["pages"],
  input: z.object({ id: z.string().uuid() }),
  output: z.object({ ok: z.literal(true) }),
  handler: async ({ id }, ctx) => {
    await sql()`delete from pages where id = ${id}`;
    ctx.log("data.write.completed", { records_deleted: 1, page_id: id, user: ctx.email });
    return { ok: true as const };
  },
});
