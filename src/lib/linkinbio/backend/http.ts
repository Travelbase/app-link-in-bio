import { uiText } from "@/lib/uiText";
import { APP_BASE } from "../urls";
import type { LinkInBioBackend, SyncedPost } from "./types";

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
  // An expired gateway session answers with the login page instead of JSON.
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) throw new Error(uiText.sessionExpired);
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
  savePage: async (page, blocks, removedIds) =>
    (await api<{ updatedAt: string }>("POST", "page/save", { page, blocks: blocks.map((b, i) => ({ ...b, position: i })), removedIds })).updatedAt,
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

  instagramFeed: async (pageId) => (await api<{ posts: SyncedPost[] | null }>("GET", "instagram/feed", { pageId })).posts,
  instagram: (action, pageId) => api("POST", "instagram", { action, pageId }),
  updateSyncedPost: async (id, patch) => { await api("POST", "instagram/post", { id, ...patch }); },
  instagramConfigured: async () => (await api<{ configured: boolean }>("GET", "instagram/configured")).configured,
  startNewPageInstagram: () => api("POST", "instagram/start-new", {}),
  pendingProfile: (key) => api("POST", "instagram/pending", { key }),
  claimPending: (key, pageId) => api("POST", "instagram/claim", { key, pageId }),

  shortLink: async (pageId) => (await api<{ url: string | null }>("POST", "short-link", { pageId })).url,
  linkStats: (pageId, from, to) => api("GET", "link-stats", { pageId, from, to }),
};
