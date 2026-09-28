import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db } from '../_shared/instagram.ts';
import { readSignedRequest } from '../_shared/meta-signed.ts';

const STATUS_BASE = 'https://1ac32895-ee15-4dba-bafb-925b49045861.lovable.app/data-deletion';

// Meta calls this when a user asks for their data to be deleted: connection, token and synced posts go.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const data = await readSignedRequest(req).catch(() => null);
  if (!data) return new Response(JSON.stringify({ error: 'Invalid signed_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const client = db();
  const { data: rows } = await client.from('instagram_connections').select('page_id').eq('instagram_user_id', String(data.user_id));
  const pageIds = (rows ?? []).map((r) => r.page_id);
  if (pageIds.length) {
    const { data: posts } = await client.from('instagram_posts').select('page_id,instagram_media_id,image_url').in('page_id', pageIds);
    const paths = (posts ?? []).map((p) => p.image_url.split('/page-images/')[1]).filter(Boolean);
    if (paths.length) await client.storage.from('page-images').remove(paths);
    await client.from('instagram_posts').delete().in('page_id', pageIds);
    await client.from('instagram_disconnect_notices').upsert(pageIds.map((page_id) => ({ page_id, reason: 'deleted', created_at: new Date().toISOString() })));
  }
  await client.from('instagram_connections').delete().eq('instagram_user_id', String(data.user_id));
  await client.from('instagram_pending_connections').delete().eq('instagram_user_id', String(data.user_id));
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return new Response(JSON.stringify({ url: `${STATUS_BASE}?code=${code}`, confirmation_code: code }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
