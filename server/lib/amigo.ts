import { config } from "./config";

/**
 * Brand colours from Amigo (Core API). Core keeps each brand's website palette as brand settings
 * (`brand_theme_*`); a brand resource carries them, resolved, in `settingValues`. Only brands with
 * a primary colour come back. Cached for ten minutes: palettes change rarely and the list is small.
 */
export interface AmigoPalette {
  primary: string;
  button: string | null;
  buttonText: string | null;
  background: string | null;
  text: string | null;
  blockBackground: string | null;
  blockText: string | null;
}

export interface AmigoBrand { code: string; name: string; palette: AmigoPalette }

interface BrandResource {
  attributes: { code: string; name: Record<string, string> | string | null; settingValues: Record<string, unknown> | null };
}

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; brands: AmigoBrand[] } | null = null;

export const amigoConfigured = () => Boolean(config.core.token());

const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);

export function toBrand(r: BrandResource): AmigoBrand | null {
  const s = r.attributes.settingValues ?? {};
  const primary = color(s.brandThemePrimaryColor);
  if (!primary) return null;
  const name = r.attributes.name;
  return {
    code: r.attributes.code,
    name: (typeof name === "string" ? name : name?.nl || name?.en || Object.values(name ?? {})[0]) || r.attributes.code,
    palette: {
      primary,
      button: color(s.brandThemeButtonColor),
      buttonText: color(s.brandThemeButtonTextColor),
      background: color(s.brandThemeBackgroundColor),
      text: color(s.brandThemeTextColor),
      blockBackground: color(s.brandThemeBlockBackgroundColor),
      blockText: color(s.brandThemeBlockTextColor),
    },
  };
}

/** Every active brand that has colours in Amigo, by name. */
export async function amigoBrands(): Promise<AmigoBrand[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.brands;
  const url = `${config.core.url()}/brands?filter[excludeArchived]=true&fields[brands]=code,name,settingValues&page[size]=500`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.core.token()}`, Accept: "application/vnd.api+json" } });
  if (!res.ok) throw new Error(`Core API ${res.status}`);
  const body = (await res.json()) as { data: BrandResource[] };
  const brands = body.data.map(toBrand).filter((b): b is AmigoBrand => b !== null).sort((a, b) => a.name.localeCompare(b.name));
  cache = { at: Date.now(), brands };
  return brands;
}
