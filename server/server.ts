import { createApp } from "@travelbase/app-api-kit";

import { listAmigoBrands } from "./api/brands";
import { instagram, instagramConfigured, instagramFeed, claimPending, pendingProfile, startNewPageInstagram, updateSyncedPost } from "./api/instagram";
import { linkStats, shortLink } from "./api/links";
import { addressTakenAction, createPage, deletePage, getPage, listPages, savePage, templateBlocks } from "./api/pages";
import { publicFeed, publicPage } from "./api/public";
import { config, missingConfig } from "./lib/config";
import { migrate } from "./lib/db";
import { rawRoutes } from "./lib/routes";

// Say what is missing at boot rather than on the first click; the service still starts.
for (const name of missingConfig()) console.warn(JSON.stringify({ severity: "WARNING", app: config.appId, event: "config.missing", name }));

if (config.databaseUrl()) {
  await migrate((msg) => console.log(JSON.stringify({ severity: "INFO", app: config.appId, event: "db.migrated", msg })));
}

/** The editor's API (behind the gateway login) and the SPA. */
const app = createApp({
  appId: config.appId,
  basePath: config.basePath,
  spaRoot: "./dist",
  title: "Link in bio API",
  version: "1.0.0",
  description: "Pages, blocks, images, Instagram, Bitly and Amigo brand colours for the link-in-bio editor. Public pages read from /a/link-in-bio/public/api.",
  actions: [
    listPages, getPage, savePage, addressTakenAction, templateBlocks, createPage, deletePage,
    instagramFeed, instagram, updateSyncedPost, instagramConfigured, startNewPageInstagram, pendingProfile, claimPending,
    shortLink, linkStats, listAmigoBrands,
  ],
});

/** What visitors without a login read, under the gateway's /public/ prefix. */
const publicApp = createApp({
  appId: config.appId,
  basePath: `${config.basePath}public/`,
  title: "Link in bio public API",
  version: "1.0.0",
  actions: [publicPage, publicFeed],
});

const PUBLIC_API = `${config.basePath}public/api/`;

export default {
  port: Number(process.env.PORT) || 8080,
  fetch: async (req: Request) =>
    (await rawRoutes(req)) ?? (new URL(req.url).pathname.startsWith(PUBLIC_API) ? publicApp.fetch(req) : app.fetch(req)),
};
