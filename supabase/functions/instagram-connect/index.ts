import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { db, callbackUrl, configured, allowedOrigin, graph, syncPage, syncAvatar } from '../_shared/instagram.ts';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const digest = async (state: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state)))).map((n) => n.toString(16).padStart(2, '0')).join('');
const message = (error: unknown) => error instanceof Error ? error.message : 'Instagram connection failed.';
const unguessable = () => crypto.randomUUID() + crypto.randomUUID();

async function exchange(code: string) {
  const body = new URLSearchParams({ client_id: Deno.env.get('INSTAGRAM_APP_ID') ?? '', client_secret: Deno.env.get('INSTAGRAM_APP_SECRET') ?? '', grant_type: 'authorization_code', redirect_uri: callbackUrl, code });
  const shortResponse = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body });
  const short = await shortResponse.json();
  if (!shortResponse.ok || !short.access_token) throw new Error(short.error_message ?? 'Instagram could not authorize this account. While the Meta app is in development, only invited tester accounts can connect.');
  const longUrl = new URL('https://graph.instagram.com/access_token');
  longUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longUrl.searchParams.set('client_secret', Deno.env.get('INSTAGRAM_APP_SECRET') ?? '');
  longUrl.searchParams.set('access_token', short.access_token);
  const longResponse = await fetch(longUrl);
  const long = await longResponse.json();
  if (!longResponse.ok || !long.access_token) throw new Error(long.error?.message ?? 'Instagram could not issue a long-lived connection.');
  const account = await graph('me?fields=user_id,username,name,profile_picture_url', long.access_token);
  return { token: long.access_token as string, expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString(), account, userId: String(account.user_id ?? short.user_id) };
}

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
    const isNew = !saved.page_id;
    let target: URL;
    if (isNew) target = new URL('/', saved.return_origin);
    else {
      const { data: page } = await client.from('pages').select('address').eq('id', saved.page_id).maybeSingle();
      target = new URL(`/edit/${page?.address ?? ''}`, saved.return_origin);
    }
    try {
      if (url.searchParams.has('error')) throw new Error('Instagram permission was not granted.');
      if (!configured()) throw new Error('The Instagram app has not been set up yet.');
      const code = url.searchParams.get('code');
      if (!code) throw new Error('Instagram did not return a connection code.');
      const result = await exchange(code);
      if (isNew) {
        // No page yet: park the connection under a one-time key the new-page dialog claims.
        const key = unguessable();
        const { error } = await client.from('instagram_pending_connections').insert({ key_hash: await digest(key), instagram_user_id: result.userId, username: result.account.username, name: result.account.name ?? '', profile_picture_url: result.account.profile_picture_url ?? '', access_token: result.token, token_expires_at: result.expiresAt, expires_at: new Date(Date.now() + 3600000).toISOString() });
        if (error) throw error;
        target.searchParams.set('new_page', key);
      } else {
        const { error } = await client.from('instagram_connections').upsert({ page_id: saved.page_id, instagram_user_id: result.userId, username: result.account.username, access_token: result.token, token_issued_at: new Date().toISOString(), token_expires_at: result.expiresAt, last_error: null });
        if (error) throw error;
        await client.from('instagram_disconnect_notices').delete().eq('page_id', saved.page_id);
        await syncPage(saved.page_id);
        target.searchParams.set('instagram', 'connected');
      }
    } catch (e) {
      if (isNew) target.searchParams.set('new_page', 'error'); else target.searchParams.set('instagram', 'error');
      target.searchParams.set('reason', message(e).slice(0, 200));
    }
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: target.toString() } });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const input = await req.json();
    const action = input?.action;

    if (action === 'start_new') {
      if (!configured()) return json({ error: 'The Instagram app has not been set up yet.' }, 503);
      if (!allowedOrigin(input.origin)) return json({ error: 'Invalid editor address' }, 400);
      const state = unguessable();
      const { error } = await client.from('instagram_oauth_states').insert({ state_hash: await digest(state), page_id: null, return_origin: input.origin, expires_at: new Date(Date.now() + 10 * 60000).toISOString() });
      if (error) throw error;
      const authorize = new URL('https://www.instagram.com/oauth/authorize');
      authorize.search = new URLSearchParams({ client_id: Deno.env.get('INSTAGRAM_APP_ID') ?? '', redirect_uri: callbackUrl, response_type: 'code', scope: 'instagram_business_basic', state, force_reauth: 'true' }).toString();
      return json({ url: authorize.toString() });
    }
    if (action === 'configured') return json({ configured: configured() });
    if (action === 'pending_profile' || action === 'claim_pending') {
      const key = String(input?.key ?? '');
      if (key.length < 60) return json({ error: 'Invalid request' }, 400);
      const keyHash = await digest(key);
      const { data: pending } = await client.from('instagram_pending_connections').select('*').eq('key_hash', keyHash).maybeSingle();
      if (!pending || new Date(pending.expires_at).getTime() < Date.now()) return json({ error: 'This Instagram login has expired. Please connect again.' }, 410);
      if (action === 'pending_profile') return json({ username: pending.username, name: pending.name, profile_picture_url: pending.profile_picture_url });
      const pageId = input?.pageId;
      if (!/^[0-9a-f-]{36}$/i.test(pageId ?? '')) return json({ error: 'Invalid request' }, 400);
      const { error } = await client.from('instagram_connections').upsert({ page_id: pageId, instagram_user_id: pending.instagram_user_id, username: pending.username, access_token: pending.access_token, token_issued_at: new Date().toISOString(), token_expires_at: pending.token_expires_at, last_error: null });
      if (error) throw error;
      await client.from('instagram_pending_connections').delete().eq('key_hash', keyHash);
      try { await syncAvatar(pageId, pending.profile_picture_url); } catch { /* avatar is best effort */ }
      try { await syncPage(pageId); } catch (e) { return json({ ok: true, syncError: message(e) }); }
      return json({ ok: true });
    }

    const pageId = input?.pageId;
    if (!/^[0-9a-f-]{36}$/i.test(pageId ?? '') || !['status', 'start', 'sync', 'disconnect'].includes(action)) return json({ error: 'Invalid request' }, 400);
    const { data: page } = await client.from('pages').select('id').eq('id', pageId).maybeSingle();
    if (!page) return json({ error: 'Page not found' }, 404);
    if (action === 'status') {
      const { data: connection } = await client.from('instagram_connections').select('username,last_synced_at,last_error').eq('page_id', pageId).maybeSingle();
      const { data: notice } = await client.from('instagram_disconnect_notices').select('reason').eq('page_id', pageId).maybeSingle();
      return json({ configured: configured(), connection, revoked: !connection && !!notice });
    }
    if (action === 'start') {
      if (!configured()) return json({ error: 'The Instagram app has not been set up yet.' }, 503);
      if (!allowedOrigin(input.origin)) return json({ error: 'Invalid editor address' }, 400);
      const state = unguessable();
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
