import type { BlockContentMap } from "@/lib/linkinbio/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/lib/linkinbio/theme";

export function ProfileHeader({ content }: { content: BlockContentMap["profile"] }) {
  const t = useTheme();
  const instagramAvatar = t.houseStyle && !content.avatar_custom && content.avatar_url?.includes("/instagram/");
  return (
    <div className="flex flex-col items-center text-center animate-fade-in-up" style={t.text}>
      <Avatar className={`h-24 w-24 mb-4 ${t.houseStyle ? instagramAvatar ? "border-0" : "border-0 p-4" : "border-4"}`} style={{ borderColor: t.design.block_color, background: t.houseStyle ? t.design.block_color : undefined, boxShadow: t.houseStyle ? "none" : t.block.boxShadow }}>
        <AvatarImage src={content.avatar_url} alt={content.name} className={t.houseStyle && !instagramAvatar ? "object-contain" : "object-cover"} />
        <AvatarFallback className="text-2xl" style={{ background: t.design.block_color, color: t.design.block_text_color, fontFamily: t.fonts.display }}>
          {content.name?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <h1 className={`text-xl mb-1 break-words max-w-full ${t.houseStyle ? "font-bold" : "font-semibold"}`} style={{ fontFamily: t.fonts.display }}>
        {content.name}
      </h1>
      {content.tagline && <p className="text-sm opacity-80 break-words max-w-full">{content.tagline}</p>}
    </div>
  );
}
