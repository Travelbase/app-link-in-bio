import { uiText } from "@/lib/uiText";
import { APP_BASE } from "../urls";
import type { LinkInBioBackend, SharedDrive, SyncedPost } from "./types";

/**
 * Production (GCP): the app's own API in the same container, under /a/link-in-bio/api
 * (behind the gateway login) and /a/link-in-bio/public/api (no login). Same origin, so no CORS
 * and no keys in the browser. Responses use the app-api-kit envelope { data, error, meta }.
 */
type Query = Record<string, string | undefined>;

async function call<T>(method: "GET" | "POST", path: string, input: Query | object = {}): Promise<T> {
  let url = `${APP_BASE}${path}`;
  const init: RequestInit = { method, headers: { Accept: "application/json" }, credentials: "same-origin" };
  if (method === "GET") {
    const q = new URLSearchParams(Object.entries(input).filter(([, v]) => v !== undefined) as [string, string][]);
    if ([...q].length) url += `?${q}`;
  } else {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(input);
  }
  const res = await fetch(url, init);
  // An expired gateway session answers 401, or with the login page instead of JSON.
  if (res.status === 401 || !(res.headers.get("content-type") ?? "").includes("application/json")) throw new Error(uiText.sessionExpired);
  const body = (await res.json()) as { data: T; error: { code: string; message: string } | null };
  if (body.error) throw Object.assign(new Error(body.error.message), { code: body.error.code });
  return body.data;
}

const api = <T>(method: "GET" | "POST", path: string, input?: Query | object) => call<T>(method, `api/${path}`, input);

export const httpBackend: LinkInBioBackend = {
  publicPage: (address) => call("GET", "public/api/page", { address: address.toLowerCase() }),
  publicFeed: async (pageId) => (await call<{ posts: SyncedPost[] | null }>("GET", "public/api/feed", { pageId })).posts,
  getPage: (address) => api("GET", "page", { address: address.toLowerCase() }),
  listPages: () => api("GET", "pages"),
  saveDraft: async (page, blocks) =>
    (await api<{ updatedAt: string }>("POST", "page/save", { page, blocks: blocks.map((b, i) => ({ ...b, position: i })) })).updatedAt,
  publish: async (id) => (await api<{ publishedAt: string }>("POST", "page/publish", { id })).publishedAt,
  discardDraft: async (id) => { await api("POST", "page/discard", { id }); },
  isAddressTaken: async (address, exceptId) => (await api<{ taken: boolean }>("GET", "address-taken", { address, exceptId })).taken,
  templateBlocks: (market) => api("GET", "template", { market }),
  createPage: (input) => api("POST", "page/create", input),
  deletePage: async (id) => { await api("POST", "page/delete", { id }); },

  uploadImage(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${APP_BASE}api/images?name=${encodeURIComponent(file.name)}`);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as { data: { url: string } | null; error: { message: string } | null };
          if (body.data) resolve(body.data.url);
          else reject(new Error(body.error?.message ?? `HTTP ${xhr.status}`));
        } catch { reject(new Error(uiText.sessionExpired)); }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  },

  imageSources: () => api("GET", "picker/sources"),
  libraryPickerUrl: async () => (await api<{ pickerUrl: string }>("POST", "picker/library", {})).pickerUrl,
  driveSharedDrives: async () => (await api<{ drives: SharedDrive[] }>("POST", "picker/drive/drives", {})).drives,
  driveList: (scope, term, pageToken) => api("POST", "picker/drive/list", { scope, term: term || null, pageToken }),
  driveThumbnailUrl: (link) => `${APP_BASE}api/picker/drive/thumbnail?link=${encodeURIComponent(link)}`,
  unsplashSearch: (q, page) => api("GET", "picker/unsplash", { q, page: String(page) }),
  async pickedImage(pick) {
    const res = await fetch(`${APP_BASE}api/picker/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(pick),
    });
    if (res.status === 401) throw new Error(uiText.sessionExpired);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("json") || type.includes("html")) {
      const body = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
    }
    return res.blob();
  },

  instagramFeed: async (pageId) => (await api<{ posts: SyncedPost[] | null }>("GET", "instagram/feed", { pageId })).posts,
  instagram: (action, pageId) => api("POST", "instagram", { action, pageId }),
  updateSyncedPost: async (id, patch) => { await api("POST", "instagram/post", { id, ...patch }); },
  instagramConfigured: async () => (await api<{ configured: boolean }>("GET", "instagram/configured")).configured,
  startNewPageInstagram: () => api("POST", "instagram/start-new", {}),
  pendingProfile: (key) => api("POST", "instagram/pending", { key }),
  claimPending: (key, pageId) => api("POST", "instagram/claim", { key, pageId }),

  shortLink: async (pageId) => (await api<{ url: string | null }>("POST", "short-link", { pageId })).url,
  renameShortLink: async (pageId, backHalf) => (await api<{ url: string }>("POST", "short-link/rename", { pageId, backHalf })).url,
  linkStats: (pageId, from, to) => api("GET", "link-stats", { pageId, from, to }),
  amigoBrands: () => api("GET", "amigo/brands"),
};
