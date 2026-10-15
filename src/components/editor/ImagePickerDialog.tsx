import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { backend, type PickedImage } from "@/lib/linkinbio/backend";
import { uiText } from "@/lib/uiText";
import { DriveTab } from "./DriveTab";
import { UnsplashTab } from "./UnsplashTab";

const t = uiText.editor.picker;

export type Pick = { kind: "file"; file: File } | PickedImage;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pick: Pick) => void;
}

/**
 * The image picker, like Amigo's: Travelbase Media Search, the shared Google Drives, the
 * computer and Unsplash. Every pick goes back to ImageUpload, which scales and uploads it.
 */
export function ImagePickerDialog({ open, onOpenChange, onPick }: Props) {
  const sources = useQuery({ queryKey: ["imageSources"], queryFn: () => backend.imageSources(), staleTime: 10 * 60_000, enabled: open });
  const s = sources.data ?? { library: false, drive: false, unsplash: false };
  const first = s.library ? "library" : "computer";
  const [tab, setTab] = useState<string | null>(null);
  useEffect(() => { if (!open) setTab(null); }, [open]);

  const pick = (p: Pick) => {
    onOpenChange(false);
    onPick(p);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(720px,90vh)] max-w-4xl flex-col gap-3 p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>
        {sources.isLoading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs value={tab ?? first} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto sm:self-start">
              {s.library && <TabsTrigger value="library">{t.library}</TabsTrigger>}
              {s.drive && <TabsTrigger value="drive">{t.drive}</TabsTrigger>}
              <TabsTrigger value="computer">{t.computer}</TabsTrigger>
              {s.unsplash && <TabsTrigger value="unsplash">{t.unsplash}</TabsTrigger>}
            </TabsList>
            {s.library && (
              <TabsContent value="library" className="mt-3 min-h-0 flex-1">
                <LibraryTab onPick={pick} />
              </TabsContent>
            )}
            {s.drive && (
              <TabsContent value="drive" className="mt-3 min-h-0 flex-1">
                <DriveTab onPick={pick} />
              </TabsContent>
            )}
            <TabsContent value="computer" className="mt-3 min-h-0 flex-1">
              <ComputerTab onPick={pick} />
            </TabsContent>
            {s.unsplash && (
              <TabsContent value="unsplash" className="mt-3 min-h-0 flex-1">
                <UnsplashTab onPick={pick} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Media Search's own picker in an iframe; it posts the chosen asset back to this window. */
function LibraryTab({ onPick }: { onPick: (p: Pick) => void }) {
  const session = useQuery({ queryKey: ["libraryPicker"], queryFn: () => backend.libraryPickerUrl(), staleTime: 60 * 60_000, retry: 1 });
  const url = session.data;

  useEffect(() => {
    if (!url) return;
    const origin = new URL(url).origin;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.data?.source !== "tb-media-picker" || e.data.type !== "select") return;
      const id = e.data.assets?.[0]?.drive_file_id;
      if (typeof id === "string") onPick({ kind: "library", id });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [url, onPick]);

  if (session.isError) return <p className="text-sm text-destructive">{t.failed}</p>;
  if (!url) return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  return <iframe title={t.library} src={`${url}&kinds=image&select=single`} className="h-full w-full rounded-md border" />;
}

function ComputerTab({ onPick }: { onPick: (p: Pick) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (f: File | undefined) => f && onPick({ kind: "file", file: f });
  return (
    <div
      className={`flex h-full flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-6 text-sm text-muted-foreground ${over ? "border-primary bg-muted/60" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
    >
      <Upload className="h-6 w-6" />
      <p>{t.drop}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>{t.browse}</Button>
      <p className="text-xs">{uiText.editor.upload.hint}</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; take(f); }}
      />
    </div>
  );
}
