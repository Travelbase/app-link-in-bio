import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db } from '../_shared/instagram.ts';
import { readSignedRequest } from '../_shared/meta-signed.ts';

// Meta calls this when an account removes our app. Token + connection go; synced posts stay.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const data = await readSignedRequest(req).catch(() => null);
  if (!data) return new Response('Invalid signed_request', { status: 400, headers: corsHeaders });
  const client = db();
  const { data: rows } = await client.from('instagram_connections').select('page_id').eq('instagram_user_id', String(data.user_id));
  for (const row of rows ?? []) {
    await client.from('instagram_disconnect_notices').upsert({ page_id: row.page_id, reason: 'deauthorized', created_at: new Date().toISOString() });
  }
  await client.from('instagram_connections').delete().eq('instagram_user_id', String(data.user_id));
  await client.from('instagram_pending_connections').delete().eq('instagram_user_id', String(data.user_id));
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
