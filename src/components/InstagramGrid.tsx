import type { SyncedPost } from "@/lib/linkinbio/instagram";
import { uiText } from "@/lib/uiText";
import type { BlockContentMap } from "@/lib/linkinbio/types";
import { useTheme } from "@/lib/linkinbio/theme";
import { Layers, Play } from "lucide-react";

export function InstagramGrid({ content, syncedPosts }: { content: BlockContentMap["instagram_grid"]; syncedPosts?: SyncedPost[] | null }) {
  const t = useTheme();
  const posts = (syncedPosts ?? content.posts ?? []).filter((p) => !p.is_hidden);
  return (
    <div className="w-full animate-fade-in-up">
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post, i) => (
          <a
            key={i}
            href={(() => { const own = ("link_url" in post ? post.link_url : post.url) || content.default_url; return own ? t.link(own, "instagram_grid", "feed") : ("permalink" in post && post.permalink) || undefined; })()}
            data-track-label={("caption" in post && post.caption ? post.caption.slice(0, 60) : "") || "Instagram post"}
            target={typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {post.image_url ? <img src={post.image_url} alt={"caption" in post ? post.caption || uiText.instagramPost : uiText.instagramPost} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex h-full items-center justify-center bg-secondary text-secondary-foreground text-xs font-medium text-center p-2">{uiText.instagramPost}</span>}
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/15 transition-colors duration-300 pointer-events-none" />
            {("media_type" in post ? post.media_type === "VIDEO" : post.is_video) ? (
              <Play className="absolute top-2 right-2 h-4 w-4 fill-current text-primary-foreground drop-shadow-lg" />
            ) : ("media_type" in post ? post.media_type === "CAROUSEL_ALBUM" : post.has_multiple) ? (
              <Layers className="absolute top-2 right-2 h-4 w-4 text-primary-foreground drop-shadow-lg" />
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}
