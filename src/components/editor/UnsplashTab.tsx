import { useState } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backend } from "@/lib/linkinbio/backend";
import { uiText } from "@/lib/uiText";
import { Spinner } from "./DriveTab";
import type { Pick } from "./ImagePickerDialog";

const t = uiText.editor.picker;

/** Unsplash search through Core (the key stays there). Picks are 2048 px wide. */
export function UnsplashTab({ onPick }: { onPick: (p: Pick) => void }) {
  const [draft, setDraft] = useState("");
  const [term, setTerm] = useState("");
  const search = useInfiniteQuery({
    queryKey: ["unsplash", term],
    enabled: term.length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => backend.unsplashSearch(term, pageParam),
    getNextPageParam: (last, _all, page) => (page < last.totalPages ? page + 1 : undefined),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
  const photos = (search.data?.pages ?? []).flatMap((p) => p.results).filter((p) => p.regular);

  return (
    <div className="flex h-full flex-col gap-3">
      <form className="relative" onSubmit={(e) => { e.preventDefault(); setTerm(draft.trim()); }}>
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.searchUnsplash} className="pl-8" autoFocus />
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!term ? null
          : search.isError ? <p className="text-sm text-destructive">{t.failed}</p>
          : search.isLoading ? <Spinner />
          : !photos.length ? <p className="text-sm text-muted-foreground">{t.nothing}</p>
          : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <button key={p.id} type="button" title={p.author ? t.by(p.author) : undefined}
                  onClick={() => onPick({ kind: "unsplash", url: p.regular!.replace(/([?&])w=\d+/, "$1w=2048"), downloadLocation: p.downloadLocation })}
                  className="group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary">
                  <img src={p.thumb ?? p.regular!} alt={p.description ?? ""} loading="lazy" className="h-full w-full object-cover" />
                  {p.author && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-left text-[11px] text-white opacity-0 group-hover:opacity-100">
                      {p.author}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        {search.hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button type="button" variant="outline" size="sm" disabled={search.isFetchingNextPage} onClick={() => search.fetchNextPage()}>
              {search.isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t.loadMore}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
