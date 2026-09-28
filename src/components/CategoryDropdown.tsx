import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BlockContentMap } from "@/lib/linkinbio/types";
import { useTheme } from "@/lib/linkinbio/theme";
import { cn } from "@/lib/utils";

export function CategoryDropdown({ content }: { content: BlockContentMap["button_group"] }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTheme();

  return (
    <div className="w-full animate-fade-in-up">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 hover:brightness-95 transition-all duration-300"
        style={t.block}
      >
        <span className="font-medium break-words">{content.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="flex flex-wrap justify-center gap-2 p-2">
            {(content.items ?? []).map((item, index) => (
              <a
                key={index}
                href={t.link(item.url, "button_group", item.label)}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isOpen ? 0 : -1}
                className="px-4 py-2 text-sm rounded-full hover:brightness-95 transition-all duration-200 animate-slide-in"
                style={{ ...t.block, borderRadius: t.design.block_shape === "square" ? 0 : 9999, animationDelay: `${index * 0.05}s` }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
