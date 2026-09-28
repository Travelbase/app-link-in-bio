import { useMemo } from "react";
import type { BlockData, PageData } from "@/lib/linkinbio/types";
import { buildTheme, pageBackground, ThemeProvider } from "@/lib/linkinbio/theme";
import { ProfileHeader } from "./ProfileHeader";
import { SocialIcons } from "./SocialIcons";
import { LinkButton } from "./LinkButton";
import { CategoryDropdown } from "./CategoryDropdown";
import { FeaturedBanner } from "./FeaturedBanner";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { InstagramGrid } from "./InstagramGrid";

function renderBlock(block: BlockData) {
  switch (block.type) {
    case "profile": return <ProfileHeader content={block.content} />;
    case "social_icons": return <SocialIcons content={block.content} />;
    case "button": return <LinkButton content={block.content} />;
    case "button_group": return <CategoryDropdown content={block.content} />;
    case "featured_banner": return <FeaturedBanner content={block.content} />;
    case "carousel": return <FeaturedCarousel content={block.content} />;
    case "instagram_grid": return <InstagramGrid content={block.content} />;
    default: return null;
  }
}

interface PageRendererProps {
  page: PageData;
  blocks: BlockData[];
  /** Fill the viewport (public page). Set false inside a phone preview frame. */
  fullScreen?: boolean;
  /** Editor preview: must never be counted as a page view. */
  preview?: boolean;
}

/** Pure renderer: takes plain page + blocks data (saved or unsaved) and draws the page. */
export function PageRenderer({ page, blocks, fullScreen = true, preview = false }: PageRendererProps) {
  const theme = useMemo(() => buildTheme(page, page.address), [page]);
  const visible = useMemo(
    () => [...blocks].filter((b) => b.is_visible).sort((a, b) => a.position - b.position),
    [blocks],
  );

  return (
    <ThemeProvider value={theme}>
      <div
        className={fullScreen ? "min-h-screen w-full overflow-x-hidden" : "min-h-full w-full overflow-x-hidden"}
        data-preview={preview ? "true" : undefined}
        style={{ ...pageBackground(page), ...(fullScreen ? {} : { backgroundAttachment: "scroll" }), color: page.text_color, fontFamily: theme.fonts.body }}
      >
        <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-5">
          {visible.map((b, i) => (
            <div key={b.id ?? i}>{renderBlock(b)}</div>
          ))}
          <footer className="text-center pt-6 pb-4">
            <p className="text-xs opacity-70">© {new Date().getFullYear()} {page.display_name}</p>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}
