import { defineAction, z } from "@travelbase/app-api-kit";

import { feedOf } from "./instagram";
import { loadPage } from "./pages";

/** Served under /a/link-in-bio/public/api, the gateway's no-login prefix. Read-only. */

export const publicPage = defineAction({
  name: "publicPage",
  method: "get",
  path: "/page",
  summary: "A page as visitors see it, with its blocks",
  tags: ["public"],
  public: true,
  input: z.object({ address: z.string() }),
  output: z.object({ page: z.record(z.unknown()), blocks: z.array(z.record(z.unknown())) }).nullable(),
  handler: async ({ address }) => loadPage(address),
});

export const publicFeed = defineAction({
  name: "publicFeed",
  method: "get",
  path: "/feed",
  summary: "The synced Instagram posts of a page; null when Instagram is not connected",
  tags: ["public"],
  public: true,
  input: z.object({ pageId: z.string().uuid() }),
  output: z.object({ posts: z.array(z.record(z.unknown())).nullable() }),
  handler: async ({ pageId }) => ({ posts: await feedOf(pageId) }),
});
