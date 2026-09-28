import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlockContentMap } from "@/lib/linkinbio/types";
import { useTheme } from "@/lib/linkinbio/theme";
import { cn } from "@/lib/utils";

export function FeaturedCarousel({ content }: { content: BlockContentMap["carousel"] }) {
  const t = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const items = content.items ?? [];

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, [items.length]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -180 : 180, behavior: "smooth" });

  const navBtn = "absolute top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 text-black shadow transition-all duration-200";

  return (
    <div className="relative w-full animate-fade-in-up">
      <button aria-label="Previous" onClick={() => scroll("left")} className={cn(navBtn, "left-0", canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button aria-label="Next" onClick={() => scroll("right")} className={cn(navBtn, "right-0", canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <ChevronRight className="h-4 w-4" />
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {items.map((card, i) => (
          <a
            key={i}
            href={t.link(card.url, "carousel", card.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-[140px] overflow-hidden transition-all duration-300 hover:-translate-y-1 snap-start"
            style={t.card}
          >
            <div className="aspect-square overflow-hidden">
              {card.image_url && <img src={card.image_url} alt={card.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 leading-tight" style={{ fontFamily: t.fonts.body }}>{card.title}</h3>
              {card.subtitle && <p className="text-xs opacity-75 mt-1 line-clamp-2">{card.subtitle}</p>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
