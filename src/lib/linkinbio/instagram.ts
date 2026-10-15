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

export { waitForInstagramPopup, INSTAGRAM_POPUP_FEATURES, type InstagramPopupResult } from './instagramPopup';

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
