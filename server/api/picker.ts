import { ApiError, defineAction, upstreamFailed, z } from "@travelbase/app-api-kit";

import { driveDrives, driveFolder, driveSearch, librarySession, PickerError, pickerSources, unsplashSearch } from "../lib/picker";

/** The image picker's tabs: Media Search, Google Drive and Unsplash, all through Core API. */

const failed = (e: unknown, ctx: { log: (event: string, fields?: Record<string, unknown>) => void }, provider: string) => {
  ctx.log("external_api.failed", { provider, error: String(e) });
  if (e instanceof PickerError && e.status === 400) return new ApiError("bad_request", e.message, 400);
  return upstreamFailed(e instanceof Error ? e.message : `${provider} failed`);
};

export const imageSources = defineAction({
  name: "imageSources",
  method: "get",
  path: "/picker/sources",
  summary: "Which picker tabs work here",
  description: "False for a source Core has switched off or that the Core token may not use. Upload from the computer always works.",
  tags: ["images"],
  input: z.object({}),
  output: z.object({ library: z.boolean(), drive: z.boolean(), unsplash: z.boolean() }),
  handler: () => pickerSources(),
});

export const libraryPicker = defineAction({
  name: "libraryPicker",
  method: "post",
  path: "/picker/library",
  summary: "A Media Search picker session",
  description: "The iframe URL of Travelbase Media Search, minted by Core. Read-only, good for eight hours.",
  tags: ["images"],
  input: z.object({}),
  output: z.object({ pickerUrl: z.string(), expiresAt: z.number() }),
  handler: async (_input, ctx) => {
    try {
      return await librarySession(ctx.email);
    } catch (e) {
      throw failed(e, ctx, "media-search");
    }
  },
});

const Scope = z.object({ driveId: z.string().min(1), folderId: z.string().nullish() });
const DrivePage = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    mimeType: z.string(),
    isFolder: z.boolean(),
    thumbnailLink: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
  })),
  nextPageToken: z.string().nullable(),
});

export const driveSharedDrives = defineAction({
  name: "driveSharedDrives",
  method: "post",
  path: "/picker/drive/drives",
  summary: "The shared drives Core's service account can read",
  tags: ["images"],
  input: z.object({ pageToken: z.string().nullish() }),
  output: z.object({ drives: z.array(z.object({ id: z.string(), name: z.string() })), nextPageToken: z.string().nullable() }),
  handler: async ({ pageToken }, ctx) => {
    try {
      return await driveDrives(pageToken ?? null);
    } catch (e) {
      throw failed(e, ctx, "google-drive");
    }
  },
});

export const driveList = defineAction({
  name: "driveList",
  method: "post",
  path: "/picker/drive/list",
  summary: "Folders and images in a Drive folder, or matching a search in that shared drive",
  description: "50 per page; pass nextPageToken back for more.",
  tags: ["images"],
  input: z.object({ scope: Scope, term: z.string().max(200).nullish(), pageToken: z.string().nullish() }),
  output: DrivePage,
  handler: async ({ scope, term, pageToken }, ctx) => {
    try {
      const page = term?.trim()
        ? await driveSearch(scope, term.trim(), pageToken ?? null)
        : await driveFolder(scope, pageToken ?? null);
      return {
        items: page.items.map((i) => ({
          id: i.id, name: i.name, mimeType: i.mimeType, isFolder: i.isFolder,
          thumbnailLink: i.thumbnailLink ?? null, width: i.width ?? null, height: i.height ?? null,
        })),
        nextPageToken: page.nextPageToken ?? null,
      };
    } catch (e) {
      throw failed(e, ctx, "google-drive");
    }
  },
});

const Url = z.string().nullable();

export const unsplash = defineAction({
  name: "unsplashSearch",
  method: "get",
  path: "/picker/unsplash",
  summary: "Search Unsplash",
  description: "20 photos per page, at most page 50.",
  tags: ["images"],
  input: z.object({ q: z.string().min(1).max(200), page: z.coerce.number().int().min(1).max(50).default(1) }),
  output: z.object({
    totalPages: z.number(),
    results: z.array(z.object({
      id: z.string(),
      description: z.string().nullable(),
      thumb: Url,
      regular: Url,
      downloadLocation: Url,
      author: z.string().nullable(),
      authorUrl: Url,
    })),
  }),
  handler: async ({ q, page }, ctx) => {
    try {
      const r = await unsplashSearch(q, page);
      return {
        totalPages: Math.min(r.total_pages, 50),
        results: r.results.map((p) => ({
          id: p.id,
          description: p.description,
          thumb: p.urls.small ?? p.urls.thumb,
          regular: p.urls.regular,
          downloadLocation: p.links.download_location,
          author: p.user.name,
          authorUrl: p.user.html,
        })),
      };
    } catch (e) {
      throw failed(e, ctx, "unsplash");
    }
  },
});
