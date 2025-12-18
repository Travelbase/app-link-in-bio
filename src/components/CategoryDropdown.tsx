import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CategoryLink } from "@/data/linkData";
import { cn } from "@/lib/utils";

interface CategoryDropdownProps {
  title: string;
  links: CategoryLink[];
}

export function CategoryDropdown({ title, links }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-card text-card-foreground rounded-lg shadow-soft hover:shadow-card transition-all duration-300"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 p-2">
            {links.map((link, index) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-secondary text-secondary-foreground text-sm rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 animate-slide-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
