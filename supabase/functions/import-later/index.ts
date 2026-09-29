// One-off import of the old Later.com link-in-bio pages. Safe to re-run: existing addresses are skipped.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db } from '../_shared/instagram.ts';

const LIST = `arctictravel-fr, arctictravel_, atlas_trail, balkan-trail, dervespatrip, dolomititrail, enterthesnow, enterthewavetiktok, iceland_trail, jordantrail_, lapland-travel-de, lapland-travel, laplandtrail_, le-vespa-trip, lekingstrail, letuktuktrip, madeiratrail, montblanctrail, nomadsland_fr, nomadslandnl, nordicwoodscamping, norway-trail, portugalnomads, rhetoexperience, scotland-trail, southafricanomads, surftribefamily, theatlastrail_, thebalkantrail, thecanoetrip, thecappadociatrail, thedolomititrail, theicelandtrail, thejordantrail_, thekingstrail, thelaplandtrail, themadeiratrail, themontblanctrail, thenorwaytrail, thescotlandtrail, thetuktuktrip, thevespatrip, travelbase-de, travelbase-fr, travelbase-world, travelbasetrails, travelbasetrailsde, travelbasetreks, tribelife, ugandanomads, voyageslaponie, weadventurescom, winterwoodscamping`.split(',').map((s) => s.trim());
const MARKET: Record<string, string> = {};
for (const a of 'lapland-travel-de dervespatrip travelbase-de travelbasetrailsde'.split(' ')) MARKET[a] = 'DE';
for (const a of 'theicelandtrail themadeiratrail thevespatrip travelbase-world ugandanomads'.split(' ')) MARKET[a] = 'UK';
for (const a of 'arctictravel-fr atlas_trail balkan-trail dolomititrail iceland_trail jordantrail_ laplandtrail_ le-vespa-trip lekingstrail letuktuktrip madeiratrail montblanctrail nomadsland_fr norway-trail rhetoexperience scotland-trail travelbase-fr travelbasetreks voyageslaponie'.split(' ')) MARKET[a] = 'FR';

const API = 'https://api-prod.linkin.bio/api/v2';
const toAddress = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function stripQuery(q: string) {
  const p = new URLSearchParams(q);
  for (const k of [...p.keys()]) if (k.toLowerCase().startsWith('utm_')) p.delete(k);
  const s = p.toString();
  return s ? `?${s}` : '';
}
export function cleanUrl(url: string): string {
  if (!url) return '';
  const hashAt = url.indexOf('#');
  let main = hashAt >= 0 ? url.slice(0, hashAt) : url;
  let hash = hashAt >= 0 ? url.slice(hashAt + 1) : null;
  const qAt = main.indexOf('?');
  if (qAt >= 0) main = main.slice(0, qAt) + stripQuery(main.slice(qAt + 1));
  if (hash !== null) {
    const hq = hash.indexOf('?');
    if (hq >= 0) hash = hash.slice(0, hq) + stripQuery(hash.slice(hq + 1));
  }
  return hash !== null && hash !== '' ? `${main}#${hash}` : main;
}

const imgOf = (a: any) => a?.variants?.original?.url || a?.variants?.web?.url || a?.variants?.thumb_md?.url || '';

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 20);
}

async function processOne(later: string) {
  const client = db();
  const address = toAddress(later);
  const report: Record<string, unknown> = { later, address };
  const { data: exists } = await client.from('pages').select('id').eq('address', address).maybeSingle();
  if (exists) return { ...report, status: 'skipped (address exists)' };

  const res = await fetch(`${API}/pages?nickname=${encodeURIComponent(later)}`);
  if (!res.ok) return { ...report, status: `failed: Later returned ${res.status}` };
  const page = (await res.json()).linkinbio_page;
  if (!page) return { ...report, status: 'failed: no Later page' };
  const sp = page.social_profiles?.[0];
  const blocks = [...(page.linkinbio_blocks ?? [])].sort((a: any, b: any) => (a.index ?? 1e9) - (b.index ?? 1e9));

  let copied = 0; const failed: string[] = [];
  const copy = async (url: string) => {
    if (!url) return '';
    if (!/^https:\/\/image-cdn\.later\.com\//i.test(url)) return url;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes = await r.arrayBuffer();
      let ct = r.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
      if (ct === 'image/jpg') ct = 'image/jpeg';
      if (!ct.startsWith('image/')) throw new Error('not an image');
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('too big');
      const ext = ct === 'image/png' ? 'png' : ct === 'image/webp' ? 'webp' : ct === 'image/gif' ? 'gif' : 'jpg';
      const path = `later/${address}/${await sha(url)}.${ext}`;
      const { error } = await client.storage.from('page-images').upload(path, bytes, { contentType: ct, upsert: true });
      if (error) throw error;
      copied++;
      return client.storage.from('page-images').getPublicUrl(path).data.publicUrl;
    } catch (e) {
      failed.push(`${url} (${e instanceof Error ? e.message : 'error'})`);
      return url;
    }
  };

  const style = blocks.find((b: any) => b.block_type === 'style');
  const header = blocks.find((b: any) => b.block_type === 'header');
  const s = style?.block_data;
  const design: Record<string, unknown> = {
    background_type: 'color', background_color: '#ffffff', background_image_url: null, text_color: '#000000',
    block_color: '#000000', block_text_color: '#ffffff', font: 'roboto', block_shape: 'rounded', block_style: 'solid', block_shadow: 'hard', show_travelbase_logo: false,
  };
  if (s) {
    const bg = (style.linkinbio_attachments ?? []).find((a: any) => a.name === 'page_background');
    if (s.page_background_type === 'image_url' && bg) {
      design.background_type = 'image';
      design.background_image_url = await copy(bg.variants?.web?.url || imgOf(bg));
    }
    if (s.page_background) design.background_color = s.page_background;
    if (s.page_text_color) design.text_color = s.page_text_color;
    if (s.button_background) design.block_color = s.button_background;
    if (s.button_text_color) design.block_text_color = s.button_text_color;
    design.font = s.page_font_family === 'Oswald' ? 'montserrat' : 'roboto';
    design.block_shape = s.button_shape === '30px' ? 'round_sides' : s.button_shape === '0px' ? 'square' : 'rounded';
    design.block_style = s.button_outline === 'transparent' ? 'outline' : 'solid';
    design.block_shadow = s.button_box_shadow === 'none' ? 'none' : 'hard';
  }

  const out: { type: string; is_visible: boolean; content: unknown }[] = [];
  const hd = header?.block_data ?? {};
  const avatarAtt = (header?.linkinbio_attachments ?? []).find((a: any) => a.name === 'avatar');
  out.push({ type: 'profile', is_visible: true, content: {
    name: hd.display_name || sp?.name || later, tagline: hd.bio ?? '',
    avatar_url: await copy(imgOf(avatarAtt) || sp?.avatar_url || ''), avatar_custom: false,
  } });

  for (const b of blocks) {
    const d = b.block_data ?? {}; const on = d.enabled !== false;
    const atts = b.linkinbio_attachments ?? [];
    switch (b.block_type) {
      case 'social_link_list': {
        const items = (d.social_links ?? []).filter((l: any) => l.enabled !== false).map((l: any) => ({ platform: l.platform, url: cleanUrl(l.url ?? '') }));
        if (items.length) out.push({ type: 'social_icons', is_visible: on, content: { items } });
        break;
      }
      case 'button_list': {
        const groups = new Map((d.button_groups ?? []).map((g: any) => [g.id, g]));
        const done = new Set<string>();
        for (const btn of d.buttons ?? []) {
          if (!btn.button_group_id) {
            out.push({ type: 'button', is_visible: on && btn.enabled !== false, content: { label: btn.title ?? '', url: cleanUrl(btn.url ?? '') } });
          } else if (!done.has(btn.button_group_id)) {
            done.add(btn.button_group_id);
            const g: any = groups.get(btn.button_group_id) ?? {};
            const all = (d.buttons ?? []).filter((x: any) => x.button_group_id === btn.button_group_id);
            const enabled = all.filter((x: any) => x.enabled !== false);
            const items = (enabled.length ? enabled : all).map((x: any) => ({ label: x.title ?? '', url: cleanUrl(x.url ?? '') }));
            out.push({ type: 'button_group', is_visible: on && g.enabled !== false && enabled.length > 0, content: { label: g.title ?? '', items } });
          }
        }
        break;
      }
      case 'featured_banner': {
        const att = atts.find((a: any) => a.name === 'featured_banner_thumbnail');
        out.push({ type: 'featured_banner', is_visible: on, content: {
          image_url: await copy(imgOf(att)), title: d.title ?? '', subtitle: d.description ?? '', button_label: d.link_text ?? '', url: cleanUrl(d.url ?? ''),
        } });
        break;
      }
      case 'multi_item_banner': {
        const items = [];
        for (const it of (d.items ?? []).filter((i: any) => i.enabled !== false)) {
          const att = atts.find((a: any) => a?.data?.item_id === it.id);
          items.push({ image_url: await copy(imgOf(att)), title: it.title ?? '', subtitle: it.description ?? '', url: cleanUrl(it.url ?? '') });
        }
        out.push({ type: 'carousel', is_visible: on, content: { items } });
        break;
      }
      case 'feed': {
        if (!on) break;
        const posts = [];
        if (sp?.id) {
          const pr = await fetch(`${API}/linkinbio_posts?social_profile_id=${sp.id}&start_time=`);
          const list = pr.ok ? ((await pr.json()).linkinbio_posts ?? []) : [];
          for (const p of list) {
            posts.push({
              image_url: await copy(p.image_url ?? ''), url: cleanUrl(p.link_url ?? ''),
              is_video: p.media_type === 'video', has_multiple: p.media_type === 'carousel', instagram_media_id: p.media_id ? String(p.media_id) : undefined,
            });
          }
        }
        out.push({ type: 'instagram_grid', is_visible: posts.length > 0, content: { default_url: cleanUrl(sp?.default_link ?? ''), posts } });
        break;
      }
    }
  }

  const handle = sp?.nickname || later.replace(/^_+|_+$/g, '');
  const { data: created, error } = await client.from('pages').insert({
    ...design, address, instagram_handle: handle, display_name: (out[0].content as any).name, market: MARKET[later] ?? 'NL',
  }).select('id').single();
  if (error) return { ...report, status: `failed: ${error.message}` };
  const { error: bErr } = await client.from('blocks').insert(out.map((b, i) => ({ page_id: created.id, position: i, ...b })));
  if (bErr) { await client.from('pages').delete().eq('id', created.id); return { ...report, status: `failed: ${bErr.message}` }; }
  return { ...report, status: 'created', blocks: out.length, images_copied: copied, images_failed: failed.length, failed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(10, Math.max(1, Number(url.searchParams.get('limit') ?? 3) || 3));
  const results = [];
  for (const later of LIST.slice(offset, offset + limit)) {
    try { results.push(await processOne(later)); } catch (e) { results.push({ later, status: `failed: ${e instanceof Error ? e.message : 'error'}` }); }
  }
  const next = offset + limit < LIST.length ? offset + limit : null;
  return new Response(JSON.stringify({ total: LIST.length, next, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
