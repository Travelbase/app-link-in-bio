import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db, callbackUrl, configured, allowedOrigin, graph, syncPage } from '../_shared/instagram.ts';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const digest = async (state: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state)))).map((n) => n.toString(16).padStart(2, '0')).join('');
const message = (error: unknown) => error instanceof Error ? error.message : 'Instagram connection failed.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const client = db();
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const state = url.searchParams.get('state') ?? '';
    const hash = await digest(state);
    const { data: saved } = await client.from('instagram_oauth_states').select('*').eq('state_hash', hash).maybeSingle();
    if (!saved || new Date(saved.expires_at).getTime() < Date.now() || !allowedOrigin(saved.return_origin)) return json({ error: 'This connection request has expired.' }, 400);
    await client.from('instagram_oauth_states').delete().eq('state_hash', hash);
    const { data: page } = await client.from('pages').select('address').eq('id', saved.page_id).maybeSingle();
    const target = new URL(`/edit/${page?.address ?? ''}`, saved.return_origin);
    try {
      if (url.searchParams.has('error')) throw new Error('Instagram permission was not granted.');
      if (!configured()) throw new Error('The Instagram app has not been set up yet.');
      const code = url.searchParams.get('code');
      if (!code) throw new Error('Instagram did not return a connection code.');
      const body = new URLSearchParams({ client_id: Deno.env.get('INSTAGRAM_APP_ID') ?? '', client_secret: Deno.env.get('INSTAGRAM_APP_SECRET') ?? '', grant_type: 'authorization_code', redirect_uri: callbackUrl, code });
      const shortResponse = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
      const short = await shortResponse.json();
      if (!shortResponse.ok || !short.access_token) throw new Error(short.error_message ?? 'Instagram could not authorize this account.');
      const longUrl = new URL('https://graph.instagram.com/access_token');
      longUrl.searchParams.set('grant_type', 'ig_exchange_token');
      longUrl.searchParams.set('client_secret', Deno.env.get('INSTAGRAM_APP_SECRET') ?? '');
      longUrl.searchParams.set('access_token', short.access_token);
      const longResponse = await fetch(longUrl);
      const long = await longResponse.json();
      if (!longResponse.ok || !long.access_token) throw new Error(long.error?.message ?? 'Instagram could not issue a long-lived connection.');
      const account = await graph('me?fields=user_id,username', long.access_token);
      const { error } = await client.from('instagram_connections').upsert({ page_id: saved.page_id, instagram_user_id: String(account.user_id ?? short.user_id), username: account.username, access_token: long.access_token, token_issued_at: new Date().toISOString(), token_expires_at: new Date(Date.now() + long.expires_in * 1000).toISOString(), last_error: null });
      if (error) throw error;
      await syncPage(saved.page_id);
      target.searchParams.set('instagram', 'connected');
    } catch (e) { target.searchParams.set('instagram', 'error'); target.searchParams.set('reason', message(e).slice(0, 200)); }
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: target.toString() } });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const input = await req.json();
    const pageId = input?.pageId;
    const action = input?.action;
    if (!/^[0-9a-f-]{36}$/i.test(pageId ?? '') || !['status', 'start', 'sync', 'disconnect'].includes(action)) return json({ error: 'Invalid request' }, 400);
    const { data: page } = await client.from('pages').select('id').eq('id', pageId).maybeSingle();
    if (!page) return json({ error: 'Page not found' }, 404);
    if (action === 'status') {
      const { data: connection } = await client.from('instagram_connections').select('username,last_synced_at,last_error').eq('page_id', pageId).maybeSingle();
      return json({ configured: configured(), connection });
    }
    if (action === 'start') {
      if (!configured()) return json({ error: 'The Instagram app has not been set up yet.' }, 503);
      if (!allowedOrigin(input.origin)) return json({ error: 'Invalid editor address' }, 400);
      const state = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await client.from('instagram_oauth_states').insert({ state_hash: await digest(state), page_id: pageId, return_origin: input.origin, expires_at: new Date(Date.now() + 10 * 60000).toISOString() });
      if (error) throw error;
      const authorize = new URL('https://www.instagram.com/oauth/authorize');
      authorize.search = new URLSearchParams({ client_id: Deno.env.get('INSTAGRAM_APP_ID') ?? '', redirect_uri: callbackUrl, response_type: 'code', scope: 'instagram_business_basic', state, force_reauth: 'true' }).toString();
      return json({ url: authorize.toString() });
    }
    if (action === 'sync') { await syncPage(pageId); return json({ ok: true }); }
    const { error } = await client.from('instagram_connections').delete().eq('page_id', pageId);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) { return json({ error: message(e) }, 500); }
});
