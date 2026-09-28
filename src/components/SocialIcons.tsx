import type { BlockContentMap, SocialPlatform } from "@/lib/linkinbio/types";
import { Facebook, Linkedin, Mail, Instagram, Youtube, MessageCircle, Globe } from "lucide-react";
import { useTheme } from "@/lib/linkinbio/theme";
import { isValidUrl } from "@/lib/linkinbio/validation";

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const iconMap: Record<SocialPlatform, React.ComponentType<{ className?: string }>> = {
  pinterest: PinterestIcon,
  tiktok: TikTokIcon,
  facebook: Facebook,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  whatsapp: MessageCircle,
  email: Mail,
  website: Globe,
};

export function SocialIcons({ content }: { content: BlockContentMap["social_icons"] }) {
  const t = useTheme();
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      {(content.items ?? []).filter((l) => isValidUrl(l.url)).map((link, i) => {
        const Icon = iconMap[link.platform] ?? Mail;
        return (
          <a
            key={i}
            href={t.link(link.url, "social_icons", link.platform)}
            data-track-label={link.platform}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-80 hover:opacity-100 transition-all duration-300 hover:scale-110"
            style={t.text}
            aria-label={link.platform}
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
}
