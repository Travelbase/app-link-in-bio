import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { db } from '../_shared/instagram.ts';

const Body = z.object({
  pageId: z.string().uuid(),
  kind: z.enum(['interactions', 'locations']),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: 'Invalid body' }, 400); }
  const p = Body.safeParse(raw);
  if (!p.success) return json({ error: p.error.flatten().fieldErrors }, 400);
  const { pageId, kind, from, to } = p.data;
  if (from > to) return json({ error: 'Start date is after end date' }, 400);
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 400) return json({ error: 'Range too long' }, 400);
  const client = db();
  const args = { _page: pageId, _from: from, _to: to };
  if (kind === 'interactions') {
    const [daily, links] = await Promise.all([client.rpc('analytics_daily', args), client.rpc('analytics_top_links', args)]);
    if (daily.error || links.error) return json({ error: 'Could not load analytics' }, 500);
    return json({ daily: daily.data, topLinks: links.data });
  }
  const loc = await client.rpc('analytics_locations', args);
  if (loc.error) return json({ error: 'Could not load analytics' }, 500);
  return json({ locations: loc.data });
});
