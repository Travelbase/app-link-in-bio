import { ExternalLink } from "lucide-react";
import type { BlockContentMap } from "@/lib/linkinbio/types";
import { useTheme } from "@/lib/linkinbio/theme";

export function LinkButton({ content }: { content: BlockContentMap["button"] }) {
  const t = useTheme();
  return (
    <a
      href={t.link(content.url, "button", content.label)}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-full flex items-center justify-center gap-2 py-4 px-6 text-center hover:brightness-95 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
      style={t.block}
    >
      <span className="font-medium break-words">{content.label}</span>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </a>
  );
}
