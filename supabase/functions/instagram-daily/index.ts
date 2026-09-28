import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db, syncPage } from '../_shared/instagram.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Only the database timer knows this secret (stored in a server-only table).
  const client = db();
  const given = req.headers.get('x-job-secret') ?? '';
  const { data: row } = await client.from('internal_job_secrets').select('secret').eq('name', 'instagram_daily').maybeSingle();
  if (!row?.secret || given.length !== row.secret.length || given !== row.secret) return new Response('Forbidden', { status: 403, headers: corsHeaders });
  const { data, error } = await client.from('instagram_connections').select('page_id');
  if (error) return new Response('Could not load connections', { status: 500, headers: corsHeaders });
  const results = await Promise.allSettled((data ?? []).map((c) => syncPage(c.page_id)));
  return new Response(JSON.stringify({ synced: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
