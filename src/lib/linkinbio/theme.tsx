import { createContext, useContext, type CSSProperties } from "react";
import type { FontKey, PageDesign } from "./types";
import { withUtm } from "./utm";

export const FONTS: Record<FontKey, { display: string; body: string }> = {
  "playfair-dmsans": { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" },
  montserrat: { display: "'Montserrat', sans-serif", body: "'Montserrat', sans-serif" },
  roboto: { display: "'Roboto', sans-serif", body: "'Roboto', sans-serif" },
  dmsans: { display: "'DM Sans', sans-serif", body: "'DM Sans', sans-serif" },
};

const SHADOWS = {
  none: "none",
  soft: "0 4px 20px rgba(0,0,0,0.08)",
  hard: "4px 4px 0 rgba(0,0,0,0.85)",
};

const RADIUS = { round_sides: "9999px", rounded: "1rem", square: "0" };
const CARD_RADIUS = { round_sides: "1.25rem", rounded: "1rem", square: "0" };

export interface Theme {
  design: PageDesign;
  address: string;
  fonts: { display: string; body: string };
  /** Styles for buttons / pill-style blocks. */
  block: CSSProperties;
  /** Styles for image cards (banner, carousel) — radius capped so images stay readable. */
  card: CSSProperties;
  text: CSSProperties;
  houseStyle: boolean;
  link: (url: string, blockType: string, label: string) => string;
}

export function buildTheme(design: PageDesign, address: string): Theme {
  const houseStyle = design.background_color.toLowerCase() === "#eaf1ee" && design.block_color.toLowerCase() === "#3e6255" && design.font === "montserrat";
  const outline = design.block_style === "outline";
  const base: CSSProperties = {
    background: outline ? "transparent" : design.block_color,
    color: outline ? design.text_color : design.block_text_color,
    border: outline ? `2px solid ${design.block_color}` : "2px solid transparent",
    boxShadow: SHADOWS[design.block_shadow] ?? "none",
  };
  return {
    design,
    address,
    fonts: FONTS[design.font] ?? FONTS["playfair-dmsans"],
    block: { ...base, borderRadius: houseStyle ? "12px" : RADIUS[design.block_shape] },
    card: { ...base, borderRadius: houseStyle ? "12px" : CARD_RADIUS[design.block_shape] },
    text: { color: design.text_color },
    houseStyle,
    link: (url, blockType, label) => withUtm(url, address, blockType, label),
  };
}

export function pageBackground(design: PageDesign): CSSProperties {
  if (design.background_type === "image" && design.background_image_url) {
    return {
      backgroundColor: design.background_color.startsWith("#") ? design.background_color : undefined,
      backgroundImage: `url("${design.background_image_url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    };
  }
  return { background: design.background_color };
}

const ThemeContext = createContext<Theme | null>(null);
export const ThemeProvider = ThemeContext.Provider;
export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme must be used inside PageRenderer");
  return t;
}
