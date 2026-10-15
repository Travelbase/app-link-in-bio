import { config, publicPageUrl } from "./config";
import { sql } from "./db";

/**
 * Short links and visit numbers from Bitly (API v4). Each page gets bit.ly/<address> when that
 * back-half is free; otherwise the random link Bitly hands out. Visits are the clicks on it.
 */
const API = "https://api-ssl.bitly.com/v4";

type Log = (event: string, fields?: Record<string, unknown>) => void;

export const bitlyConfigured = () => Boolean(config.bitly.token());

async function bitly<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.bitly.token()}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`Bitly ${res.status}: ${body.description || body.message || "request failed"}`);
  return body as T;
}

/** Shortens `longUrl` and tries to give it the back-half `backHalf`; returns the bitlink id, e.g. "bit.ly/outpostnorth". */
export async function shorten(longUrl: string, backHalf: string, log: Log): Promise<string> {
  const domain = config.bitly.domain();
  const group = config.bitly.groupGuid();
  const link = await bitly<{ id: string }>("/shorten", {
    method: "POST",
    body: JSON.stringify({ long_url: longUrl, domain, ...(group ? { group_guid: group } : {}) }),
  });
  // bit.ly is shared by everyone, so common names are taken; then tb-<address>, then Bitly's random link.
  for (const half of [backHalf, `tb-${backHalf}`]) {
    try {
      const custom = await bitly<{ custom_bitlink: string }>("/custom_bitlinks", {
        method: "POST",
        body: JSON.stringify({ custom_bitlink: `${domain}/${half}`, bitlink_id: link.id }),
      });
      return custom.custom_bitlink.replace(/^https?:\/\//, "");
    } catch (error) {
      log("external_api.failed", { provider: "bitly", step: "custom_bitlink", back_half: half, error: String(error) });
    }
  }
  return link.id;
}

/** The page's short link for its current address, created on first ask. Null without a Bitly token. */
export async function ensureShortLink(pageId: string, log: Log): Promise<string | null> {
  if (!bitlyConfigured()) return null;
  const db = sql();
  const [page] = await db<{ address: string }[]>`select address from pages where id = ${pageId}`;
  if (!page) return null;
  const [existing] = await db<{ bitlink: string; custom_link: string | null }[]>`
    select bitlink, custom_link from page_short_links where page_id = ${pageId} and address = ${page.address}`;
  if (existing) return `https://${existing.custom_link ?? existing.bitlink}`;
  const bitlink = await shorten(publicPageUrl(page.address), page.address, log);
  await db`insert into page_short_links (page_id, address, bitlink) values (${pageId}, ${page.address}, ${bitlink}) on conflict do nothing`;
  log("data.write.completed", { records_written: 1, table: "page_short_links" });
  return `https://${bitlink}`;
}

/**
 * Gives the page's bitlink another back-half, bit.ly/<backHalf>. The old link keeps working and the
 * visits stay on the same bitlink. Throws "taken" when Bitly has that back-half already.
 */
export async function renameShortLink(pageId: string, backHalf: string, log: Log): Promise<string> {
  const current = await ensureShortLink(pageId, log);
  if (!current) throw new Error("Bitly is not set up");
  const db = sql();
  const [row] = await db<{ bitlink: string; address: string }[]>`
    select l.bitlink, l.address from page_short_links l join pages p on p.id = l.page_id and p.address = l.address where l.page_id = ${pageId}`;
  const custom = `${config.bitly.domain()}/${backHalf}`;
  if (current === `https://${custom}`) return current;
  try {
    // Bitly hangs a back-half on the original bitlink only; ours is often a custom one already (bit.ly/tb-…).
    const original = await bitly<{ bitlink: { id: string } }>(`/custom_bitlinks/${encodeURIComponent(row!.bitlink)}`)
      .then((r) => r.bitlink.id, () => row!.bitlink);
    await bitly("/custom_bitlinks", { method: "POST", body: JSON.stringify({ custom_bitlink: custom, bitlink_id: original }) });
  } catch (error) {
    log("external_api.failed", { provider: "bitly", step: "rename", back_half: backHalf, error: String(error) });
    throw Object.assign(new Error(String(error)), { taken: /already|taken|exist|ALREADY_A_BITLY_LINK|409/i.test(String(error)) });
  }
  await db`update page_short_links set custom_link = ${custom} where page_id = ${pageId} and address = ${row!.address}`;
  log("data.write.completed", { records_written: 1, table: "page_short_links", page_id: pageId });
  return `https://${custom}`;
}

type Metric = { value: string; clicks: number };

/** Daily visits, countries and referrers between two dates (YYYY-MM-DD, inclusive). */
export async function stats(bitlink: string, from: string, to: string, log: Log) {
  const units = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  // Bitly refuses a reference in the future; without one it counts back from now.
  const end = `${to}T23:59:59+0000`;
  const q = `unit=day&units=${units}${Date.parse(end) < Date.now() ? `&unit_reference=${encodeURIComponent(end)}` : ""}`;
  const id = encodeURIComponent(bitlink);
  // Countries and referrers depend on the Bitly plan; the visit count does not.
  const optional = <T>(p: Promise<T>, fallback: T, step: string) =>
    p.catch((error) => {
      log("external_api.failed", { provider: "bitly", step, error: String(error) });
      return fallback;
    });
  const [clicks, countries, referrers] = await Promise.all([
    bitly<{ link_clicks: { date: string; clicks: number }[] }>(`/bitlinks/${id}/clicks?${q}`),
    optional(bitly<{ metrics: Metric[] }>(`/bitlinks/${id}/countries?${q}`), { metrics: [] }, "countries"),
    optional(bitly<{ metrics: Metric[] }>(`/bitlinks/${id}/referrers?${q}`), { metrics: [] }, "referrers"),
  ]);
  const byDay = new Map(clicks.link_clicks.map((c) => [c.date.slice(0, 10), c.clicks]));
  const daily = Array.from({ length: units }, (_, i) => {
    const day = new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10);
    return { day, clicks: byDay.get(day) ?? 0 };
  });
  return {
    link: `https://${bitlink}`,
    daily,
    countries: countries.metrics.map((m) => ({ country: m.value, clicks: m.clicks })),
    referrers: referrers.metrics.map((m) => ({ name: m.value, clicks: m.clicks })),
  };
}
