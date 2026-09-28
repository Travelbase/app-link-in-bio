import { AtSign, ChevronsUpDown, Images, LayoutGrid, Link2, Tag, User, type LucideIcon } from "lucide-react";
import { uiText } from "@/lib/uiText";
import type { BlockContentMap, BlockData, BlockType, PageDesign } from "./types";

type ThemeKey = keyof typeof uiText.editor.design.themeNames;

type DesignPreset = Omit<PageDesign, "background_image_url">;

export const THEME_PRESETS: Record<ThemeKey, DesignPreset> = {
  travelbase: {
    background_type: "color", background_color: "linear-gradient(180deg, #e3dccf 0%, #f0ece4 100%)",
    text_color: "#364a40", font: "playfair-dmsans", block_color: "#b3ccbf", block_text_color: "#2b3b33",
    block_shape: "rounded", block_style: "solid", block_shadow: "soft",
    button_accent_color: null, footer_logo_url: null,
  },
  travelbaseHouse: {
    background_type: "color", background_color: "#eaf1ee", text_color: "#3e6255", font: "montserrat",
    block_color: "#3e6255", block_text_color: "#ffffff", block_shape: "rounded", block_style: "solid", block_shadow: "soft",
    button_accent_color: "#e2572b", footer_logo_url: null,
  },
  light: {
    background_type: "color", background_color: "#ffffff", text_color: "#18181b", font: "dmsans",
    block_color: "#f4f4f5", block_text_color: "#18181b", block_shape: "rounded", block_style: "solid", block_shadow: "soft",
    button_accent_color: null, footer_logo_url: null,
  },
  dark: {
    background_type: "color", background_color: "#18181b", text_color: "#fafafa", font: "montserrat",
    block_color: "#27272a", block_text_color: "#fafafa", block_shape: "rounded", block_style: "solid", block_shadow: "none",
    button_accent_color: null, footer_logo_url: null,
  },
  surf: {
    background_type: "color", background_color: "#2f6f73", text_color: "#FFFFFF", font: "roboto",
    block_color: "#81BBAF", block_text_color: "#FFFFFF", block_shape: "round_sides", block_style: "solid", block_shadow: "none",
    button_accent_color: null, footer_logo_url: null,
  },
};

export const THEME_KEYS = Object.keys(THEME_PRESETS) as ThemeKey[];

export function matchingTheme(d: PageDesign): ThemeKey | null {
  for (const key of THEME_KEYS) {
    const p = THEME_PRESETS[key];
    const same = (Object.keys(p) as (keyof DesignPreset)[]).every(
      (k) => String(p[k] ?? "").toLowerCase() === String(d[k] ?? "").toLowerCase(),
    );
    if (same) return key;
  }
  return null;
}

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  profile: User,
  social_icons: AtSign,
  button: Link2,
  button_group: ChevronsUpDown,
  featured_banner: Tag,
  carousel: Images,
  instagram_grid: LayoutGrid,
};

export const ADDABLE_BLOCKS: Exclude<BlockType, "profile">[] = [
  "button", "button_group", "featured_banner", "carousel", "instagram_grid", "social_icons",
];

const ex = uiText.editor.examples;
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop`;

export function exampleContent<K extends BlockType>(type: K): BlockContentMap[K] {
  const map: { [T in BlockType]: BlockContentMap[T] } = {
    profile: { avatar_url: "", name: "", tagline: "" },
    social_icons: { items: [{ platform: "instagram", url: "https://instagram.com/" }] },
    button: { label: ex.button.label, url: ex.button.url },
    button_group: { label: ex.button_group.label, items: [{ label: ex.button_group.itemLabel, url: ex.button_group.url }] },
    featured_banner: { image_url: img("1469854523086-cc02fe5d8800"), ...ex.featured_banner },
    carousel: {
      items: [
        { image_url: img("1520769945061-0a448c463865"), ...ex.carousel },
        { image_url: img("1501785888041-af3ef285b470"), ...ex.carousel },
      ],
    },
    instagram_grid: {
      default_url: ex.instagram_grid.url,
      posts: ["1507525428034-b723cf961d3e", "1500375592092-40eb2168fd21", "1483683804023-6ccdb62f86ef"].map((id) => ({ image_url: img(id) })),
    },
  };
  return structuredClone(map[type]);
}

export function newBlock(type: Exclude<BlockType, "profile">, position: number): BlockData {
  return { id: crypto.randomUUID(), type, position, is_visible: true, content: exampleContent(type) } as BlockData;
}
