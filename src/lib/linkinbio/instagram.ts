import { supabase } from '@/integrations/supabase/client';
import { uiText } from '@/lib/uiText';

/** Turns Instagram's technical refusal into plain language; keeps the original as detail. */
export function friendlyConnectError(reason: string): { message: string; detail?: string } {
  if (/verification code|client secret|client_secret/i.test(reason)) return { message: uiText.instagramRefused, detail: reason };
  return { message: reason };
}

export interface SyncedPost {
  id: string;
  page_id: string;
  instagram_media_id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  permalink: string;
  posted_at: string;
  image_url: string;
  link_url: string;
  is_hidden: boolean;
  position: number;
}

export async function getFeed(pageId: string): Promise<SyncedPost[] | null> {
  const { data: status, error: statusError } = await supabase.functions.invoke('instagram-connect', { body: { action: 'status', pageId } });
  if (statusError) throw statusError;
  if (!status?.connection) return null;
  const { data, error } = await supabase.from('instagram_posts').select('*').eq('page_id', pageId).order('posted_at', { ascending: false }).limit(24);
  if (error) throw error;
  return (data ?? []) as SyncedPost[];
}

export async function instagramAction(action: 'status' | 'start' | 'sync' | 'disconnect', pageId: string) {
  const { data, error } = await supabase.functions.invoke('instagram-connect', { body: { action, pageId, origin: window.location.origin } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { configured?: boolean; revoked?: boolean; connection?: { username: string; last_synced_at: string | null; last_error: string | null } | null; url?: string };
}

export async function updateSyncedPost(id: string, patch: { link_url?: string; is_hidden?: boolean }) {
  const { error } = await supabase.from('instagram_posts').update(patch).eq('id', id);
  if (error) throw error;
}

export interface PendingProfile { username: string; name: string; profile_picture_url: string }

export interface InstagramPopupResult { status: 'ok' | 'error' | 'cancelled'; key?: string; reason?: string }

export const INSTAGRAM_POPUP_FEATURES = 'width=480,height=640';

/** Runs the Instagram login in a pre-opened pop-up window and waits for it to report back. */
export function waitForInstagramPopup(popup: Window, url: string): Promise<InstagramPopupResult> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r: InstagramPopupResult) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
      try { if (!popup.closed) popup.close(); } catch { /* ignore */ }
      resolve(r);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== popup) return;
      const d = e.data as { type?: string; status?: string; key?: string; reason?: string };
      if (d?.type !== 'instagram-connect') return;
      if (d.status === 'ok') finish(d.key ? { status: 'ok', key: d.key } : { status: 'ok' });
      else finish({ status: 'error', reason: d.reason || '' });
    };
    const timer = setInterval(() => { if (popup.closed) finish({ status: 'cancelled' }); }, 500);
    window.addEventListener('message', onMessage);
    popup.location.href = url;
  });
}

/** Instagram login for a page that doesn't exist yet; returns Instagram's login URL. */
export async function newPageInstagram(action: 'configured' | 'start_new'): Promise<{ configured?: boolean; url?: string }>;
export async function newPageInstagram(action: 'pending_profile', key: string): Promise<PendingProfile>;
export async function newPageInstagram(action: 'claim_pending', key: string, pageId: string): Promise<{ ok: boolean; syncError?: string }>;
export async function newPageInstagram(action: string, key?: string, pageId?: string) {
  const { data, error } = await supabase.functions.invoke('instagram-connect', { body: { action, key, pageId, origin: window.location.origin } });
  if (data?.error) throw new Error(data.error);
  if (error) throw error;
  return data;
}
