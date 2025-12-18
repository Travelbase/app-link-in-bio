import { GridPost } from "@/data/linkData";
import { Layers, Play } from "lucide-react";

interface InstagramGridProps {
  posts: GridPost[];
}

export function InstagramGrid({ posts }: InstagramGridProps) {
  return (
    <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
      <div className="grid grid-cols-3 gap-1">
        {posts.map((post, index) => (
          <a
            key={post.id}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-square overflow-hidden group"
            style={{ animationDelay: `${0.35 + index * 0.03}s` }}
          >
            <img
              src={post.imageUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
            
            {/* Indicators */}
            {post.hasMultiple && (
              <div className="absolute top-2 right-2 text-primary-foreground drop-shadow-lg">
                <Layers className="h-4 w-4" />
              </div>
            )}
            {post.isVideo && (
              <div className="absolute top-2 right-2 text-primary-foreground drop-shadow-lg">
                <Play className="h-4 w-4 fill-current" />
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
