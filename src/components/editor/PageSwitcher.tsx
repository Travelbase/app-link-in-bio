import { useState } from "react";
import { publicHostPrefix } from "@/lib/linkinbio/urls";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PageSummary } from "@/lib/linkinbio/api";
import { uiText } from "@/lib/uiText";

interface Props {
  current: { id?: string; display_name: string; address: string; avatar_url?: string | null };
  pages: PageSummary[];
  onNewPage: () => void;
}

const PageAvatar = ({ url, name, size = "h-9 w-9" }: { url?: string | null; name: string; size?: string }) => (
  <Avatar className={`${size} border`}>
    {url && <AvatarImage src={url} alt="" className="object-cover" />}
    <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
  </Avatar>
);

export function PageSwitcher({ current, pages, onNewPage }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? pages.filter((p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.instagram_handle.toLowerCase().includes(q))
    : pages;
  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setQuery(""); }}>
      <DropdownMenuTrigger
        className="flex min-w-0 max-w-[280px] items-center gap-2.5 rounded-full border bg-background py-1 pl-1 pr-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={uiText.editor.switchPage}
      >
        <PageAvatar url={current.avatar_url} name={current.display_name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{current.display_name}</span>
          <span className="block truncate text-xs text-muted-foreground">{publicHostPrefix()}{current.address}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <div className="flex items-center gap-2 border-b px-2.5 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={uiText.editor.searchPages}
            aria-label={uiText.editor.searchPages}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">{uiText.editor.noPagesFound}</p>
          )}
          {filtered.map((p) => (
            <DropdownMenuItem key={p.id} className="gap-2.5 py-2" onClick={() => p.id !== current.id && navigate(`/edit/${p.address}`)}>
              <PageAvatar url={p.avatar_url} name={p.display_name} size="h-8 w-8" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.display_name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{p.instagram_handle}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 py-2 font-medium" onClick={onNewPage}>
          <Plus className="h-4 w-4" /> {uiText.editor.newPage}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
