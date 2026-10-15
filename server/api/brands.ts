import { defineAction, upstreamFailed, z } from "@travelbase/app-api-kit";

import { amigoBrands, amigoConfigured } from "../lib/amigo";

const Color = z.string().nullable();

export const listAmigoBrands = defineAction({
  name: "amigoBrands",
  method: "get",
  path: "/amigo/brands",
  summary: "Brands with their colour palette from Amigo",
  description: "Null when CORE_API_TOKEN is not set. Only brands that have colours in Amigo.",
  tags: ["brands"],
  input: z.object({}),
  output: z.array(z.object({
    code: z.string(),
    name: z.string(),
    palette: z.object({
      primary: z.string(), button: Color, buttonText: Color, background: Color, text: Color, blockBackground: Color, blockText: Color,
    }),
  })).nullable(),
  handler: async (_input, ctx) => {
    if (!amigoConfigured()) return null;
    try {
      return await amigoBrands();
    } catch (e) {
      ctx.log("external_api.failed", { provider: "core-api", error: String(e) });
      throw upstreamFailed(e instanceof Error ? e.message : "Amigo failed");
    }
  },
});
