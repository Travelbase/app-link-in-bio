import { uiText } from "@/lib/uiText";
import type { BlockData } from "./types";

const t = uiText.editor;

export const RESERVED_ADDRESSES = ["edit", "admin", "api", "settings", "data-deletion"];
const ADDRESS_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Returns an error message, or null when the address format is fine (uniqueness is checked separately). */
export function addressError(address: string): string | null {
  if (!address) return t.address.required;
  if (!ADDRESS_RE.test(address)) return t.address.format;
  if (RESERVED_ADDRESSES.includes(address)) return t.address.reserved;
  return null;
}

export function suggestAddress(handle: string): string {
  return handle
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[_.\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /^https:\/\/[^\s]+\.[^\s]+/i.test(url) || /^mailto:[^\s@]+@[^\s@]+/i.test(url);
}

const filled = (s?: string | null) => !!s && s.trim().length > 0;

/** A block is incomplete when a required link or image is missing; incomplete blocks are hidden from visitors. */
export function isBlockComplete(b: BlockData): boolean {
  switch (b.type) {
    case "profile": return true;
    // Empty slots are fine (they're hidden); at least one working link is needed.
    case "social_icons": return (b.content.items ?? []).some((i) => isValidUrl(i.url));
    case "button": return filled(b.content.label) && isValidUrl(b.content.url);
    case "button_group":
      return filled(b.content.label) && b.content.items?.length > 0 && b.content.items.every((i) => filled(i.label) && isValidUrl(i.url));
    case "featured_banner":
      return filled(b.content.image_url) && filled(b.content.title) && filled(b.content.button_label) && isValidUrl(b.content.url);
    case "carousel":
      return b.content.items?.length > 0 && b.content.items.every((i) => filled(i.image_url) && filled(i.title) && isValidUrl(i.url));
    case "instagram_grid":
      // Default link is optional: posts without a link open on Instagram instead.
      return (!b.content.default_url || isValidUrl(b.content.default_url)) && (b.content.posts ?? []).every((p) => !p.url || isValidUrl(p.url));
    default: return true;
  }
}

export function blockSummary(b: BlockData): string {
  switch (b.type) {
    case "profile": return b.content.name;
    case "social_icons": return t.linksCount(b.content.items?.length ?? 0);
    case "button": return b.content.label;
    case "button_group": return b.content.label;
    case "featured_banner": return b.content.title;
    case "carousel": return t.itemsCount(b.content.items?.length ?? 0);
    case "instagram_grid": return t.postsCount(b.content.posts?.filter((p) => !p.is_hidden).length ?? 0);
  }
}
