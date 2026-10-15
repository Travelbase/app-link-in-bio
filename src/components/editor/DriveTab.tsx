import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronRight, Folder, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { backend, type DriveItem } from "@/lib/linkinbio/backend";
import { uiText } from "@/lib/uiText";
import type { Pick } from "./ImagePickerDialog";

const t = uiText.editor.picker;

/**
 * The shared drives Core's service account can read, like Amigo's Drive tab: pick a drive, open
 * folders, or search the whole drive. Nobody signs in to Google here.
 */
export function DriveTab({ onPick }: { onPick: (p: Pick) => void }) {
  const drives = useQuery({ queryKey: ["driveDrives"], queryFn: () => backend.driveSharedDrives(), staleTime: 10 * 60_000 });
  const [driveId, setDriveId] = useState<string | null>(null);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    if (!driveId && drives.data?.[0]) setDriveId(drives.data[0].id);
  }, [drives.data, driveId]);

  const folderId = path.at(-1)?.id ?? null;
  const list = useInfiniteQuery({
    queryKey: ["driveList", driveId, folderId, term],
    enabled: !!driveId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => backend.driveList({ driveId: driveId!, folderId }, term, pageParam),
    getNextPageParam: (last) => last.nextPageToken,
    staleTime: 5 * 60_000,
  });
  const items = (list.data?.pages ?? []).flatMap((p) => p.items).filter((i) => i.isFolder || i.mimeType.startsWith("image/"));

  const openFolder = (item: DriveItem) => {
    setTerm("");
    setDraft("");
    setPath((p) => [...p, { id: item.id, name: item.name }]);
  };

  if (drives.isError) return <p className="text-sm text-destructive">{t.failed}</p>;
  if (drives.isLoading) return <Spinner />;
  if (!drives.data?.length) return <p className="text-sm text-muted-foreground">{t.noDrives}</p>;
  const driveName = drives.data.find((d) => d.id === driveId)?.name ?? "";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={driveId ?? undefined} onValueChange={(v) => { setDriveId(v); setPath([]); setTerm(""); setDraft(""); }}>
          <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {drives.data.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); setTerm(draft.trim()); }}>
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.searchDrive} className="pl-8" />
        </form>
      </div>
      {!term && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" className="hover:underline" onClick={() => setPath([])}>{driveName}</button>
          {path.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button type="button" className="hover:underline" onClick={() => setPath((p) => p.slice(0, i + 1))}>{f.name}</button>
            </span>
          ))}
        </nav>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.isError ? <p className="text-sm text-destructive">{t.failed}</p>
          : list.isLoading ? <Spinner />
          : !items.length ? <p className="text-sm text-muted-foreground">{term ? t.nothing : t.emptyFolder}</p>
          : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {items.map((item) => item.isFolder ? (
                <button key={item.id} type="button" onClick={() => openFolder(item)}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border bg-muted/40 p-2 text-center text-xs hover:bg-muted">
                  <Folder className="h-6 w-6 text-muted-foreground" />
                  <span className="line-clamp-2 break-all">{item.name}</span>
                </button>
              ) : (
                <button key={item.id} type="button" title={item.name} onClick={() => onPick({ kind: "drive", id: item.id })}
                  className="aspect-square overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary">
                  {item.thumbnailLink
                    ? <img src={backend.driveThumbnailUrl(item.thumbnailLink)} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                    : <span className="p-1 text-xs">{item.name}</span>}
                </button>
              ))}
            </div>
          )}
        {list.hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button type="button" variant="outline" size="sm" disabled={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
              {list.isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{t.loadMore}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Spinner() {
  return <div className="flex h-full min-h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}
