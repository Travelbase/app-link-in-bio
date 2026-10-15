import type { BlockData, Market, PageData } from "../types";

/**
 * Every read and write the app does goes through this interface. Two implementations:
 * `supabase.ts` (Lovable preview and staging, talks to Lovable Cloud) and `http.ts`
 * (production on GCP, talks to the app's own /api). `VITE_DATA_BACKEND` picks one at build time.
 * New data access goes here, in both implementations, never straight from a component.
 */
export interface LinkInBioBackend {
  /** A page as visitors see it. No login. */
  publicPage(address: string): Promise<{ page: PageData; blocks: BlockData[] } | null>;
  /** Its synced Instagram posts, or null when Instagram is not connected. No login. */
  publicFeed(pageId: string): Promise<SyncedPost[] | null>;
  /** The page as the editor works on it: its draft when there is one, else the live page. */
  getPage(address: string): Promise<EditorPage | null>;
  /** All pages, most recently edited first. */
  listPages(): Promise<PageSummary[]>;
  /** Saves the page settings and the full block list as the draft; returns the new updated_at. Visitors don't see it. */
  saveDraft(page: PageData, blocks: BlockData[]): Promise<string>;
  /** Makes the draft live; returns published_at. */
  publish(pageId: string): Promise<string>;
  /** Throws the draft away. */
  discardDraft(pageId: string): Promise<void>;
  isAddressTaken(address: string, exceptId?: string): Promise<boolean>;
  templateBlocks(market: Market): Promise<BlockData[]>;
  createPage(input: NewPageInput): Promise<{ id: string; address: string }>;
  deletePage(id: string): Promise<void>;
  /** Uploads an image with progress reporting; resolves to its public URL. */
  uploadImage(file: File, onProgress: (pct: number) => void): Promise<string>;

  /** Synced posts of a page, or null when Instagram is not connected. */
  instagramFeed(pageId: string): Promise<SyncedPost[] | null>;
  instagram(action: "status" | "start" | "sync" | "disconnect", pageId: string): Promise<InstagramResult>;
  updateSyncedPost(id: string, patch: { link_url?: string; is_hidden?: boolean }): Promise<void>;
  /** Instagram login for a page that does not exist yet. */
  instagramConfigured(): Promise<boolean>;
  startNewPageInstagram(): Promise<{ url?: string }>;
  pendingProfile(key: string): Promise<PendingProfile>;
  claimPending(key: string, pageId: string): Promise<{ ok: boolean; syncError?: string }>;

  /** The page's short link (bit.ly), created on first ask. Null where there is no Bitly (staging). */
  shortLink(pageId: string): Promise<string | null>;
  /** Gives the short link another back-half (bit.ly/<backHalf>); resolves to the new link. */
  renameShortLink(pageId: string, backHalf: string): Promise<string>;
  /** Visits through the short link. Null where there is no Bitly (staging). */
  linkStats(pageId: string, from: string, to: string): Promise<LinkStats | null>;

  /** Brands with their colours from Amigo. Null where there is no Amigo (staging). */
  amigoBrands(): Promise<AmigoBrand[] | null>;
}

export interface AmigoBrand {
  code: string;
  name: string;
  palette: {
    primary: string;
    button: string | null;
    buttonText: string | null;
    background: string | null;
    text: string | null;
    blockBackground: string | null;
    blockText: string | null;
  };
}

export interface EditorPage {
  page: PageData;
  blocks: BlockData[];
  hasDraft: boolean;
  /** The address visitors use now; the draft may have another. */
  liveAddress: string;
}

export interface NewPageInput { handle: string; displayName: string; address: string; market: Market }

export interface PageSummary {
  id: string;
  address: string;
  display_name: string;
  instagram_handle: string;
  updated_at: string;
  avatar_url: string | null;
}

export interface SyncedPost {
  id: string;
  page_id: string;
  instagram_media_id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption: string;
  permalink: string;
  posted_at: string;
  image_url: string;
  link_url: string;
  is_hidden: boolean;
  position: number;
}

export interface InstagramResult {
  configured?: boolean;
  revoked?: boolean;
  connection?: { username: string; last_synced_at: string | null; last_error: string | null } | null;
  url?: string;
}

export interface PendingProfile { username: string; name: string; profile_picture_url: string }

export interface LinkStats {
  link: string;
  daily: { day: string; clicks: number }[];
  /** ISO 3166 alpha-2 codes. */
  countries: { country: string; clicks: number }[];
  referrers: { name: string; clicks: number }[];
}
