import { ApiError, badRequest, defineAction, upstreamFailed, z } from "@travelbase/app-api-kit";

import { bitlyConfigured, ensureShortLink, renameShortLink, stats } from "../lib/bitly";
import { sql } from "../lib/db";

/** The bit.ly link of a page and the visits through it. */

export const shortLink = defineAction({
  name: "shortLink",
  method: "post",
  path: "/short-link",
  summary: "The page's bit.ly link for its current address, created on first ask",
  description: "Null when BITLY_TOKEN is not set. Tries bit.ly/<address>; Bitly's random link when that is taken.",
  tags: ["links"],
  input: z.object({ pageId: z.string().uuid() }),
  output: z.object({ url: z.string().nullable() }),
  handler: async ({ pageId }, ctx) => {
    try {
      return { url: await ensureShortLink(pageId, ctx.log) };
    } catch (e) {
      throw upstreamFailed(e instanceof Error ? e.message : "Bitly failed");
    }
  },
});

export const renameLink = defineAction({
  name: "renameShortLink",
  method: "post",
  path: "/short-link/rename",
  summary: "Give the page's bit.ly link another back-half",
  description: "The old link keeps working; visits keep counting on the same bitlink. 409 when the back-half is taken on Bitly.",
  tags: ["links"],
  input: z.object({ pageId: z.string().uuid(), backHalf: z.string().regex(/^[A-Za-z0-9_-]{3,50}$/) }),
  output: z.object({ url: z.string() }),
  handler: async ({ pageId, backHalf }, ctx) => {
    if (!bitlyConfigured()) throw badRequest("Bitly is not set up");
    try {
      return { url: await renameShortLink(pageId, backHalf, ctx.log) };
    } catch (e) {
      if ((e as { taken?: boolean }).taken) throw new ApiError("link_taken", "That link is taken.", 409);
      throw upstreamFailed(e instanceof Error ? e.message : "Bitly failed");
    }
  },
});

export const linkStats = defineAction({
  name: "linkStats",
  method: "get",
  path: "/link-stats",
  summary: "Visits through the page's bit.ly link per day, country and referrer",
  description: "Null when BITLY_TOKEN is not set. Dates are YYYY-MM-DD, inclusive, at most 400 days apart.",
  tags: ["links"],
  input: z.object({
    pageId: z.string().uuid(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  output: z.object({
    link: z.string(),
    daily: z.array(z.object({ day: z.string(), clicks: z.number() })),
    countries: z.array(z.object({ country: z.string(), clicks: z.number() })),
    referrers: z.array(z.object({ name: z.string(), clicks: z.number() })),
  }).nullable(),
  handler: async ({ pageId, from, to }, ctx) => {
    if (!bitlyConfigured()) return null;
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 400) throw badRequest("Invalid date range");
    await ensureShortLink(pageId, ctx.log);
    const [page] = await sql()<{ bitlink: string; custom_link: string | null }[]>`
      select l.bitlink, l.custom_link from page_short_links l join pages p on p.id = l.page_id and p.address = l.address where l.page_id = ${pageId}`;
    if (!page) return null;
    try {
      // Bitly counts each back-half on its own, so a renamed link adds up the old and the new name.
      const parts = await Promise.all([page.bitlink, page.custom_link].filter((l): l is string => !!l).map((l) => stats(l, from, to, ctx.log)));
      const result = { ...mergeStats(parts), link: `https://${page.custom_link ?? page.bitlink}` };
      ctx.log("data.read.completed", { provider: "bitly", page_id: pageId });
      return result;
    } catch (e) {
      throw upstreamFailed(e instanceof Error ? e.message : "Bitly failed");
    }
  },
});

type Stats = Awaited<ReturnType<typeof stats>>;

/** Adds up the visits of several names of the same link. */
export function mergeStats(parts: Stats[]): Omit<Stats, "link"> {
  const sum = <K extends string>(rows: Record<K | "clicks", string | number>[], key: K) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(String(r[key]), (m.get(String(r[key])) ?? 0) + Number(r.clicks));
    return [...m].map(([k, clicks]) => ({ [key]: k, clicks })).sort((a, b) => b.clicks - a.clicks);
  };
  return {
    daily: sum(parts.flatMap((p) => p.daily), "day").sort((a, b) => String(a.day).localeCompare(String(b.day))) as Stats["daily"],
    countries: sum(parts.flatMap((p) => p.countries), "country") as Stats["countries"],
    referrers: sum(parts.flatMap((p) => p.referrers), "name") as Stats["referrers"],
  };
}
