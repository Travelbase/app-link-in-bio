import { ExternalLink } from "lucide-react";
import type { BlockContentMap } from "@/lib/linkinbio/types";
import { useTheme } from "@/lib/linkinbio/theme";

export function FeaturedBanner({ content }: { content: BlockContentMap["featured_banner"] }) {
  const t = useTheme();
  return (
    <div className="w-full overflow-hidden animate-fade-in-up" style={t.card}>
      <a href={t.link(content.url, "featured_banner", content.title)} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="relative h-24 overflow-hidden">
          {content.image_url && (
            <img src={content.image_url} alt={content.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
          <div className="absolute inset-0 flex items-center px-4 text-white">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight" style={{ fontFamily: t.fonts.display }}>{content.title}</h3>
              {content.subtitle && <p className="text-sm mt-0.5 opacity-85">{content.subtitle}</p>}
            </div>
          </div>
        </div>
        <div className="py-3 px-4 flex items-center justify-center gap-2 group-hover:brightness-95 transition-all">
          <span className="font-medium text-sm">{content.button_label}</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300" />
        </div>
      </a>
    </div>
  );
}
