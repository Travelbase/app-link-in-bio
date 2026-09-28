import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db, syncPage } from '../_shared/instagram.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Only the server's service credential can invoke the scheduled worker.
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('Forbidden', { status: 403, headers: corsHeaders });
  const client = db();
  const { data, error } = await client.from('instagram_connections').select('page_id');
  if (error) return new Response('Could not load connections', { status: 500, headers: corsHeaders });
  const results = await Promise.allSettled((data ?? []).map((c) => syncPage(c.page_id)));
  return new Response(JSON.stringify({ synced: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
