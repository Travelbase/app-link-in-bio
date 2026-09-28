export type FontKey = "playfair-dmsans" | "montserrat" | "roboto" | "dmsans";
export type BlockShape = "round_sides" | "rounded" | "square";
export type BlockStyleKind = "solid" | "outline";
export type BlockShadow = "none" | "soft" | "hard";

export interface PageDesign {
  background_type: "color" | "image";
  /** Any CSS background value: a hex colour or a gradient. */
  background_color: string;
  background_image_url: string | null;
  text_color: string;
  font: FontKey;
  block_color: string;
  block_text_color: string;
  block_shape: BlockShape;
  block_style: BlockStyleKind;
  block_shadow: BlockShadow;
}

export interface PageData extends PageDesign {
  id?: string;
  address: string;
  instagram_handle: string;
  display_name: string;
}

export type SocialPlatform =
  | "instagram" | "tiktok" | "facebook" | "pinterest" | "linkedin" | "youtube" | "email" | "whatsapp";

export interface LinkItem { label: string; url: string }
export interface CarouselItem { image_url: string; title: string; subtitle: string; url: string }
export interface GridPost {
  image_url: string;
  url?: string;
  is_hidden?: boolean;
  is_video?: boolean;
  has_multiple?: boolean;
}

export interface BlockContentMap {
  profile: { avatar_url: string; name: string; tagline: string };
  social_icons: { items: { platform: SocialPlatform; url: string }[] };
  button: LinkItem;
  button_group: { label: string; items: LinkItem[] };
  featured_banner: { image_url: string; title: string; subtitle: string; button_label: string; url: string };
  carousel: { items: CarouselItem[] };
  instagram_grid: { default_url: string; posts: GridPost[] };
}

export type BlockType = keyof BlockContentMap;

export type BlockData = {
  [K in BlockType]: {
    id?: string;
    type: K;
    position: number;
    is_visible: boolean;
    content: BlockContentMap[K];
  };
}[BlockType];
