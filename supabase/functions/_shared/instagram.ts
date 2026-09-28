import { createClient } from 'npm:@supabase/supabase-js@2';

export const db = () => createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
export const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-connect`;
export const configured = () => Boolean(Deno.env.get('INSTAGRAM_APP_ID') && Deno.env.get('INSTAGRAM_APP_SECRET'));
export const allowedOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    if (url.origin === 'http://localhost:8080') return true;
    const id = '1ac32895-ee15-4dba-bafb-925b49045861';
    return url.protocol === 'https:' && url.hostname.includes(id) && (url.hostname.endsWith('.lovable.app') || url.hostname.endsWith('.lovableproject.com'));
  } catch { return false; }
};

export async function graph(path: string, token: string) {
  const url = new URL(`https://graph.instagram.com/${path}`);
  url.searchParams.set('access_token', token);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message ?? 'Instagram could not be reached.');
  return data;
}

export async function refresh(pageId: string, connection: Record<string, any>) {
  if (Date.now() - new Date(connection.token_issued_at).getTime() < 50 * 86400000) return connection;
  const data = await graph('refresh_access_token?grant_type=ig_refresh_token', connection.access_token);
  const updated = { ...connection, access_token: data.access_token, token_issued_at: new Date().toISOString(), token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString() };
  const { error } = await db().from('instagram_connections').update({ access_token: updated.access_token, token_issued_at: updated.token_issued_at, token_expires_at: updated.token_expires_at }).eq('page_id', pageId);
  if (error) throw error;
  return updated;
}

const suggestedLink = (caption: string) => {
  const match = caption.match(/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i);
  if (!match) return '';
  try { const url = new URL(/^https?:\/\//i.test(match[0]) ? match[0] : `https://${match[0]}`); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
};

/** Copies an image from Instagram into page-images at a fixed path; returns its public URL. */
export async function copyImage(source: string, path: string) {
  const client = db();
  const image = await fetch(source);
  if (!image.ok) throw new Error('Instagram image could not be copied.');
  const bytes = await image.arrayBuffer();
  const contentType = image.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  if (!contentType.startsWith('image/') || bytes.byteLength > 10 * 1024 * 1024) throw new Error('Instagram image is not a supported size or format.');
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const full = `${path}.${extension}`;
  const { error } = await client.storage.from('page-images').upload(full, bytes, { contentType, upsert: true });
  if (error) throw error;
  return client.storage.from('page-images').getPublicUrl(full).data.publicUrl;
}

/** Puts the Instagram profile picture on the page's Profile block, unless the team uploaded its own. */
export async function syncAvatar(pageId: string, pictureUrl: string) {
  if (!pictureUrl) return;
  const client = db();
  const { data: block } = await client.from('blocks').select('id,content').eq('page_id', pageId).eq('type', 'profile').maybeSingle();
  if (!block || (block.content as Record<string, unknown>)?.avatar_custom) return;
  const url = await copyImage(pictureUrl, `instagram/${pageId}/avatar`);
  await client.from('blocks').update({ content: { ...(block.content as Record<string, unknown>), avatar_url: `${url}?v=${Date.now()}`, avatar_custom: false } }).eq('id', block.id);
}

export async function syncPage(pageId: string) {
  const client = db();
  const { data: raw, error } = await client.from('instagram_connections').select('*').eq('page_id', pageId).single();
  if (error || !raw) throw new Error('Instagram is not connected.');
  try {
    const connection = await refresh(pageId, raw);
    try {
      const me = await graph('me?fields=profile_picture_url', connection.access_token);
      await syncAvatar(pageId, me.profile_picture_url ?? '');
    } catch { /* avatar is best effort; the feed sync continues */ }
    const data = await graph('me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24', connection.access_token);
    const media = (data.data ?? []).filter((m: Record<string, any>) => ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(m.media_type));
    const { data: previous, error: previousError } = await client.from('instagram_posts').select('instagram_media_id,link_url,is_hidden,image_url').eq('page_id', pageId);
    if (previousError) throw previousError;
    const old = new Map((previous ?? []).map((p) => [p.instagram_media_id, p]));
    const rows = [];
    for (const [position, post] of media.entries()) {
      const prior = old.get(post.id);
      let imageUrl = prior?.image_url ?? '';
      // Existing copies are stable; only download newly seen media.
      if (!imageUrl) {
        const source = post.media_type === 'VIDEO' ? post.thumbnail_url : (post.media_url || post.thumbnail_url);
        if (!source) continue;
        imageUrl = await copyImage(source, `instagram/${pageId}/${post.id}`);
      }
      rows.push({ page_id: pageId, instagram_media_id: post.id, media_type: post.media_type, caption: post.caption ?? '', permalink: post.permalink ?? '', posted_at: post.timestamp, image_url: imageUrl, position, link_url: prior?.link_url ?? suggestedLink(post.caption ?? ''), is_hidden: prior?.is_hidden ?? false });
    }
    if (rows.length) {
      const { error: upsertError } = await client.from('instagram_posts').upsert(rows, { onConflict: 'instagram_media_id' });
      if (upsertError) throw upsertError;
    }
    const ids = rows.map((r) => r.instagram_media_id);
    const removed = (previous ?? []).filter((p) => !ids.includes(p.instagram_media_id)).map((p) => p.instagram_media_id);
    if (removed.length) {
      const { error: deleteError } = await client.from('instagram_posts').delete().eq('page_id', pageId).in('instagram_media_id', removed);
      if (deleteError) throw deleteError;
    }
    const { error: statusError } = await client.from('instagram_connections').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('page_id', pageId);
    if (statusError) throw statusError;
  } catch (e) {
    await client.from('instagram_connections').update({ last_error: e instanceof Error ? e.message.slice(0, 500) : 'Sync failed' }).eq('page_id', pageId);
    throw e;
  }
}
