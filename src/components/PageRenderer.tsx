import { useMemo } from "react";
import type { BlockData, PageData } from "@/lib/linkinbio/types";
import { buildTheme, pageBackground, ThemeProvider } from "@/lib/linkinbio/theme";
import { ProfileHeader } from "./ProfileHeader";
import { SocialIcons } from "./SocialIcons";
import { LinkButton } from "./LinkButton";
import { CategoryDropdown } from "./CategoryDropdown";
import { FeaturedBanner } from "./FeaturedBanner";
import { FeaturedCarousel } from "./FeaturedCarousel";
import type { SyncedPost } from "@/lib/linkinbio/instagram";
import { InstagramGrid } from "./InstagramGrid";
import { isBlockComplete } from "@/lib/linkinbio/validation";
import { TRAVELBASE_FOOTER_LOGO } from "@/lib/linkinbio/presets";
import { uiText } from "@/lib/uiText";
import { handleTrackedClick } from "@/lib/linkinbio/tracking";

function renderBlock(block: BlockData, syncedPosts?: SyncedPost[] | null) {
  switch (block.type) {
    case "profile": return <ProfileHeader content={block.content} />;
    case "social_icons": return <SocialIcons content={block.content} />;
    case "button": return <LinkButton content={block.content} />;
    case "button_group": return <CategoryDropdown content={block.content} />;
    case "featured_banner": return <FeaturedBanner content={block.content} />;
    case "carousel": return <FeaturedCarousel content={block.content} />;
    case "instagram_grid": return <InstagramGrid content={block.content} syncedPosts={syncedPosts} />;
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
  syncedPosts?: SyncedPost[] | null;
}

/** Pure renderer: takes plain page + blocks data (saved or unsaved) and draws the page. */
export function PageRenderer({ page, blocks, fullScreen = true, preview = false, syncedPosts }: PageRendererProps) {
  const theme = useMemo(() => buildTheme(page, page.address), [page]);
  const visible = useMemo(
    () => [...blocks].filter((b) => b.is_visible && (preview || isBlockComplete(b))).sort((a, b) => a.position - b.position),
    [blocks, preview],
  );

  return (
    <ThemeProvider value={theme}>
      <div
        className={fullScreen ? "min-h-screen w-full overflow-x-hidden" : "min-h-full w-full overflow-x-hidden"}
        data-preview={preview ? "true" : undefined}
        onClickCapture={preview || !page.id ? undefined : (e) => handleTrackedClick(page.id as string, e)}
        style={{ ...pageBackground(page), ...(fullScreen ? {} : { backgroundAttachment: "scroll" }), color: page.text_color, fontFamily: theme.fonts.body }}
      >
        <div className="w-full max-w-[480px] mx-auto px-4 py-8 space-y-5">
          {visible.map((b, i) => (
            preview && !isBlockComplete(b) ? (
              <div key={b.id ?? i} className="relative" data-block-type={b.type}>
                <div className="opacity-40 pointer-events-none">{renderBlock(b, syncedPosts)}</div>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-background px-3 py-1 text-[11px] font-medium text-foreground shadow">{uiText.editor.incompleteHidden}</span>
              </div>
            ) : <div key={b.id ?? i} data-block-type={b.type} data-block-id={b.id ?? undefined}>{renderBlock(b, syncedPosts)}</div>
          ))}
          <footer className="text-center pt-6 pb-4">
            {(page.footer_logo_url || page.show_travelbase_logo) && <img src={page.footer_logo_url || TRAVELBASE_FOOTER_LOGO} alt="" className="mx-auto mb-6 h-auto w-40 max-w-full object-contain" />}
            <p className="text-xs opacity-70">© {new Date().getFullYear()} {page.display_name}</p>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}
