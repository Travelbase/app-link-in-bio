import type { BlockContentMap } from "@/lib/linkinbio/types";
import { useTheme } from "@/lib/linkinbio/theme";
import { Layers, Play } from "lucide-react";

export function InstagramGrid({ content }: { content: BlockContentMap["instagram_grid"] }) {
  const t = useTheme();
  const posts = (content.posts ?? []).filter((p) => !p.is_hidden);
  return (
    <div className="w-full animate-fade-in-up">
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post, i) => (
          <a
            key={i}
            href={t.link(post.url || content.default_url, "instagram_grid", "feed")}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden group"
          >
            <img src={post.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            {post.is_video ? (
              <Play className="absolute top-2 right-2 h-4 w-4 fill-current text-white drop-shadow-lg" />
            ) : post.has_multiple ? (
              <Layers className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-lg" />
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}
