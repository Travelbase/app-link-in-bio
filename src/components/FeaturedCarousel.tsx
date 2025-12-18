import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FeaturedCard } from "@/data/linkData";
import { cn } from "@/lib/utils";

interface FeaturedCarouselProps {
  cards: FeaturedCard[];
}

export function FeaturedCarousel({ cards }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll);
    return () => ref?.removeEventListener("scroll", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 180;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative w-full animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
      {/* Navigation Buttons */}
      <button
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 rounded-full shadow-soft transition-all duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      <button
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 rounded-full shadow-soft transition-all duration-200",
          canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Cards Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cards.map((card) => (
          <a
            key={card.id}
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-[140px] bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 snap-start"
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={card.imageUrl}
                alt={card.title}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm text-card-foreground line-clamp-2 leading-tight">
                {card.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {card.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
