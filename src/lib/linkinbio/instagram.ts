import { supabase } from '@/integrations/supabase/client';

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
  return data as { configured?: boolean; connection?: { username: string; last_synced_at: string | null; last_error: string | null } | null; url?: string };
}

export async function updateSyncedPost(id: string, patch: { link_url?: string; is_hidden?: boolean }) {
  const { error } = await supabase.from('instagram_posts').update(patch).eq('id', id);
  if (error) throw error;
}
