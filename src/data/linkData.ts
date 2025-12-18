export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: "pinterest" | "tiktok" | "facebook" | "linkedin" | "instagram" | "email";
}

export interface CategoryLink {
  id: string;
  title: string;
  url: string;
}

export interface FeaturedCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}

export interface GridPost {
  id: string;
  imageUrl: string;
  url: string;
  hasMultiple?: boolean;
  isVideo?: boolean;
}

export interface LinkBioProfile {
  name: string;
  tagline: string;
  avatarUrl: string;
}

// Travelbase Main Profile
export const mainProfile: LinkBioProfile = {
  name: "Travelbase Nederland & België",
  tagline: "Wat wordt jouw volgende avontuur? 💚",
  avatarUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop",
};

export const socialLinks: SocialLink[] = [
  { id: "1", name: "Pinterest", url: "https://pinterest.com/Travelbase_", icon: "pinterest" },
  { id: "2", name: "TikTok", url: "https://tiktok.com/@travelbase_", icon: "tiktok" },
  { id: "3", name: "Facebook", url: "https://facebook.com/Travelbase.eu", icon: "facebook" },
  { id: "4", name: "LinkedIn", url: "https://linkedin.com/company/travelbase", icon: "linkedin" },
  { id: "5", name: "Instagram", url: "https://instagram.com/travelbase_nl", icon: "instagram" },
  { id: "6", name: "Email", url: "mailto:info@travelbase.eu", icon: "email" },
];

export const categoryLinks: CategoryLink[] = [
  { id: "1", title: "Roadtrips", url: "https://travelbase.eu/reisthema/roadtrips/" },
  { id: "2", title: "Trails", url: "https://travelbase.eu/reisthema/trails/" },
  { id: "3", title: "Noorderlicht reizen", url: "https://travelbase.eu/reisthema/noorderlicht-reizen/" },
  { id: "4", title: "Glamping", url: "https://travelbase.eu/reisthema/glamping/" },
  { id: "5", title: "Vespa Trips", url: "https://travelbase.eu/reisthema/vespa-trips/" },
  { id: "6", title: "Kano & Kajak", url: "https://travelbase.eu/reisthema/kajak-kano-reizen/" },
];

export const featuredCards: FeaturedCard[] = [
  {
    id: "1",
    title: "Geef een roadtrip cadeau 🎁✨",
    description: "Bestel hier de Travelbase giftcard",
    imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop",
    url: "https://travelbase.eu/travelbase-cadeaubon/",
  },
  {
    id: "2",
    title: "Iceland Nomads",
    description: "Reis naar IJsland vanaf €750",
    imageUrl: "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=400&h=300&fit=crop",
    url: "https://icelandnomads.com/nl",
  },
  {
    id: "3",
    title: "Kyrgyzstan Nomads",
    description: "Reis naar Kyrgyzstan vanaf €1100",
    imageUrl: "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=400&h=300&fit=crop",
    url: "https://kyrgyzstannomads.com/nl/",
  },
  {
    id: "4",
    title: "🆕 Tanzania Nomads",
    description: "Reis naar Tanzania vanaf €1450",
    imageUrl: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&h=300&fit=crop",
    url: "https://tanzanianomads.com/nl/",
  },
];

export const gridPosts: GridPost[] = [
  {
    id: "1",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
    hasMultiple: true,
  },
  {
    id: "2",
    imageUrl: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
  },
  {
    id: "3",
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
    hasMultiple: true,
  },
  {
    id: "4",
    imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
    isVideo: true,
  },
  {
    id: "5",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
    hasMultiple: true,
  },
  {
    id: "6",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
  },
  {
    id: "7",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
  },
  {
    id: "8",
    imageUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
    hasMultiple: true,
  },
  {
    id: "9",
    imageUrl: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=400&h=400&fit=crop",
    url: "https://travelbase.eu/",
  },
];
