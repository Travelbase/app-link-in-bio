import type { AmigoBrand } from "./backend";
import type { PageDesign } from "./types";

/**
 * A brand's Amigo palette as page design. Same roles as on the brand's website: page background
 * and text, light blocks with dark text, the button colour as call-to-action. Shape, style,
 * shadow and font stay as they are.
 */
export function designFromBrand({ palette: p }: AmigoBrand): Partial<PageDesign> {
  const text = p.text ?? "#18181b";
  const blockText = p.blockText ?? text;
  const background = p.background ?? "#ffffff";
  // Some brands use their page background for blocks too; on a link page they would disappear.
  const block = p.blockBackground && contrast(p.blockBackground, background) >= 1.1 ? p.blockBackground : p.primary;
  return {
    background_type: "color",
    background_color: background,
    text_color: text,
    block_color: block,
    block_text_color: blockText,
    // The call-to-action carries the block text colour; leave it out where that would be unreadable.
    button_accent_color: p.button && contrast(p.button, blockText) >= 3 ? p.button : null,
  };
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
