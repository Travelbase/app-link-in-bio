import { config } from "./config";

/**
 * The image picker's sources, the same ones Amigo's picker uses: Travelbase Media Search, the
 * shared Google Drives and Unsplash. All three go through Core API's `_actions` with the app's
 * Core token (scope `use:media-picker`), so the keys and the Drive service account stay in Core
 * and the browser only ever talks to this app.
 */

export class PickerError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

const headers = () => ({ Authorization: `Bearer ${config.core.token()}`, Accept: "application/json" });

/** Core's JSON:API error detail, or a plain fallback. */
async function failure(res: Response, what: string): Promise<PickerError> {
  const body = (await res.json().catch(() => null)) as { errors?: { detail?: string; title?: string }[]; message?: string } | null;
  const detail = body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title ?? body?.message;
  return new PickerError(`${what}: ${detail ?? `Core API ${res.status}`}`, res.status === 422 ? 400 : 502);
}

async function core(method: "GET" | "POST", path: string, what: string, body?: unknown): Promise<Response> {
  if (!config.core.token()) throw new PickerError("CORE_API_TOKEN is not set on this service.");
  const res = await fetch(`${config.core.url()}/_actions/${path}`, {
    method,
    headers: body === undefined ? headers() : { ...headers(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await failure(res, what);
  return res;
}

const coreJson = async <T>(method: "GET" | "POST", path: string, what: string, body?: unknown) =>
  (await (await core(method, path, what, body)).json()) as T;

export interface PickerSources { library: boolean; drive: boolean; unsplash: boolean }

const TTL_MS = 10 * 60 * 1000;
let sourcesCache: { at: number; sources: PickerSources } | null = null;

/** Which tabs to show. A source Core has switched off, or refuses this token, stays hidden. */
export async function pickerSources(): Promise<PickerSources> {
  if (!config.core.token()) return { library: false, drive: false, unsplash: false };
  if (sourcesCache && Date.now() - sourcesCache.at < TTL_MS) return sourcesCache.sources;
  const enabled = (path: string) =>
    coreJson<{ enabled?: boolean }>("GET", path, path).then((r) => r.enabled === true, () => false);
  const [library, drive, unsplash] = await Promise.all([
    enabled("media-search/config"),
    enabled("google-drive/config"),
    // Unsplash has no config endpoint: a one-word search says whether key and scope are there.
    coreJson("GET", "unsplash/search?q=travel", "Unsplash").then(() => true, () => false),
  ]);
  sourcesCache = { at: Date.now(), sources: { library, drive, unsplash } };
  return sourcesCache.sources;
}

/** The iframe URL of the Media Search picker; its fragment carries a read-only token. `email` labels the searches. */
export const librarySession = (email: string | null) =>
  coreJson<{ pickerUrl: string; expiresAt: number }>("POST", "media-search/sessions", "Media Search", email ? { onBehalfOf: email } : {});

export interface DriveScope { driveId: string; folderId?: string | null }

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  thumbnailLink: string | null;
  width: number | null;
  height: number | null;
}

export interface DrivePage { items: DriveItem[]; nextPageToken: string | null }

export const driveDrives = (pageToken: string | null) =>
  coreJson<{ drives: { id: string; name: string }[]; nextPageToken: string | null }>("POST", "google-drive/drives", "Google Drive", { pageToken });

export const driveFolder = (scope: DriveScope, pageToken: string | null) =>
  coreJson<DrivePage>("POST", "google-drive/folder", "Google Drive", { scope, only: "all", pageToken });

/** Searches the whole shared drive the scope is in. */
export const driveSearch = (scope: DriveScope, term: string, pageToken: string | null) =>
  coreJson<DrivePage>("POST", "google-drive/search", "Google Drive", { scope, term, only: "all", allDrives: false, withinFolder: false, pageToken });

/** Drive thumbnails sit on Google hosts that refuse the browser; Core fetches them as the service account. */
export async function driveThumbnail(thumbnailLink: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }> {
  const { dataUrl } = await coreJson<{ dataUrl: string }>("POST", "google-drive/thumbnail", "Google Drive", { thumbnailLink });
  return fromDataUrl(dataUrl);
}

export function fromDataUrl(dataUrl: string): { bytes: Uint8Array<ArrayBuffer>; contentType: string } {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) throw new PickerError("Core sent an image in a form this app does not read.");
  const bytes = m[2] ? Buffer.from(m[3]!, "base64") : Buffer.from(decodeURIComponent(m[3]!));
  return { bytes: new Uint8Array(bytes), contentType: m[1] || "application/octet-stream" };
}

export interface UnsplashPhoto {
  id: string;
  width: number | null;
  height: number | null;
  description: string | null;
  urls: { thumb: string | null; small: string | null; regular: string | null; full: string | null };
  links: { html: string | null; download_location: string | null };
  user: { name: string | null; username: string | null; html: string | null };
}

export const unsplashSearch = (q: string, page: number) =>
  coreJson<{ total: number; total_pages: number; results: UnsplashPhoto[] }>(
    "GET", `unsplash/search?${new URLSearchParams({ q, page: String(page) })}`, "Unsplash",
  );

/** Unsplash only ever serves its photos from here; anything else is refused (no fetching arbitrary URLs). */
export function isUnsplashImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

/** Unsplash wants this ping for every photo that gets used. Best effort. */
export const trackUnsplashDownload = (downloadLocation: string) =>
  core("POST", "unsplash/track-download", "Unsplash", { downloadLocation }).then(() => undefined);

export type Picked =
  | { kind: "library"; id: string }
  | { kind: "drive"; id: string }
  | { kind: "unsplash"; url: string; downloadLocation: string | null };

/**
 * The bytes of a picked image. The browser then scales it to at most 2048 px / 5 MB and uploads
 * it through /api/images like any other file, so every picked image lands in the image bucket.
 */
export async function pickedImage(pick: Picked): Promise<Response> {
  if (pick.kind === "library") {
    const asset = await coreJson<{ dataUrl: string }>("POST", "media-search/asset", "Media Search", { driveFileId: pick.id });
    const { bytes, contentType } = fromDataUrl(asset.dataUrl);
    return new Response(bytes, { headers: { "Content-Type": contentType } });
  }
  if (pick.kind === "drive") {
    const res = await core("POST", "google-drive/file", "Google Drive", { fileId: pick.id });
    return new Response(res.body, { headers: { "Content-Type": res.headers.get("content-type") ?? "application/octet-stream" } });
  }
  if (!isUnsplashImage(pick.url)) throw new PickerError("Not an Unsplash image.", 400);
  const res = await fetch(pick.url);
  if (!res.ok) throw new PickerError(`Unsplash: ${res.status}`);
  if (pick.downloadLocation) void trackUnsplashDownload(pick.downloadLocation).catch(() => {});
  return new Response(res.body, { headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg" } });
}
