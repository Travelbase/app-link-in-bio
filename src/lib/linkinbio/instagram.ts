import { backend, type PendingProfile } from './backend';
import { uiText } from '@/lib/uiText';

/** Turns Instagram's technical refusal into plain language; keeps the original as detail. */
export function friendlyConnectError(reason: string): { message: string; detail?: string } {
  if (/verification code|client secret|client_secret/i.test(reason)) return { message: uiText.instagramRefused, detail: reason };
  return { message: reason };
}

export type { SyncedPost, PendingProfile } from './backend';

export const getFeed = (pageId: string) => backend.instagramFeed(pageId);

export const instagramAction = (action: 'status' | 'start' | 'sync' | 'disconnect', pageId: string) => backend.instagram(action, pageId);

export const updateSyncedPost = (id: string, patch: { link_url?: string; is_hidden?: boolean }) => backend.updateSyncedPost(id, patch);

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
  if (action === 'configured') return { configured: await backend.instagramConfigured() };
  if (action === 'start_new') return backend.startNewPageInstagram();
  if (action === 'pending_profile') return backend.pendingProfile(key!);
  return backend.claimPending(key!, pageId!);
}
