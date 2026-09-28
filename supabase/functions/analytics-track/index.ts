import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { db } from '../_shared/instagram.ts';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|preview|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|scrapy|monitor|pingdom|uptime/i;

const Body = z.object({
  pageId: z.string().uuid(),
  type: z.enum(['view', 'button_click', 'post_click']),
  blockId: z.string().uuid().nullish(),
  blockType: z.string().max(40).nullish(),
  label: z.string().max(200).nullish(),
  destination: z.string().max(1000).nullish(),
});

/** Country + city from edge headers, else a one-off lookup. The IP is never stored or logged. */
async function locate(req: Request): Promise<{ country: string | null; city: string | null }> {
  const h = req.headers;
  const hdrCountry = h.get('cf-ipcountry') || h.get('x-vercel-ip-country') || h.get('x-country');
  const hdrCity = h.get('cf-ipcity') || h.get('x-vercel-ip-city') || h.get('x-city');
  if (hdrCountry && hdrCountry !== 'XX') {
    let country = hdrCountry;
    try { country = new Intl.DisplayNames(['en'], { type: 'region' }).of(hdrCountry.toUpperCase()) ?? hdrCountry; } catch { /* keep code */ }
    return { country, city: hdrCity ? decodeURIComponent(hdrCity) : null };
  }
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || '';
  if (!ip) return { country: null, city: null };
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,city`, { signal: AbortSignal.timeout(1500) });
    const j = await res.json();
    if (!j?.success) return { country: null, city: null };
    return { country: j.country || null, city: j.city || null };
  } catch {
    return { country: null, city: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const ok = () => new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return ok();
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return ok();
  let raw: unknown;
  try { raw = JSON.parse(await req.text()); } catch { return new Response('Bad request', { status: 400, headers: corsHeaders }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return new Response('Bad request', { status: 400, headers: corsHeaders });
  const b = parsed.data;
  const client = db();
  const { data: page } = await client.from('pages').select('id').eq('id', b.pageId).maybeSingle();
  if (!page) return ok();
  const loc = await locate(req);
  await client.from('analytics_events').insert({
    page_id: b.pageId,
    event_type: b.type,
    block_id: b.type === 'view' ? null : b.blockId ?? null,
    block_type: b.type === 'view' ? null : b.blockType ?? null,
    item_label: b.type === 'view' ? null : b.label ?? null,
    destination: b.type === 'view' ? null : b.destination ?? null,
    country: loc.country,
    city: loc.city,
  });
  return ok();
});
