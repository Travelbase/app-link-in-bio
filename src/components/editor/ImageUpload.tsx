import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/linkinbio/api";
import { backend } from "@/lib/linkinbio/backend";
import { prepareImage } from "@/lib/linkinbio/prepareImage";
import { uiText } from "@/lib/uiText";
import { ImagePickerDialog, type Pick } from "./ImagePickerDialog";

const t = uiText.editor.upload;

interface Props {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  compact?: boolean;
}

export function ImageUpload({ label, value, onChange, compact }: Props) {
  const [picking, setPicking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPick, setLastPick] = useState<Pick | null>(null);

  /** Any pick (computer, Media Search, Drive, Unsplash) is scaled to fit and uploaded to the image bucket. */
  const start = async (pick: Pick) => {
    setError(null);
    setLastPick(pick);
    setProgress(0);
    try {
      const blob = pick.kind === "file" ? pick.file : await backend.pickedImage(pick);
      const name = pick.kind === "file" ? pick.file.name : `${pick.kind}.${(blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg")}`;
      const file = await prepareImage(blob, name);
      const url = await uploadImage(file, setProgress);
      onChange(url);
      setLastPick(null);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "not_image" || code === "too_big") setLastPick(null);
      setError(code === "not_image" ? t.notImage : code === "too_big" ? t.tooBig : t.failed);
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex gap-3 rounded-md bg-muted/60 p-3">
        <div className={`${compact ? "h-14 w-14" : "h-20 w-20"} shrink-0 overflow-hidden rounded border bg-background flex items-center justify-center`}>
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => setPicking(true)}>
            {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {uploading ? t.uploading : value ? t.replace : t.upload}
          </Button>
          {uploading && <Progress value={progress} className="h-1.5" />}
          {!compact && !uploading && <p className="text-xs text-muted-foreground">{t.hint}</p>}
          {error && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-destructive" role="alert">
              <span>{error}</span>
              {lastPick && error === t.failed && (
                <button type="button" className="underline" onClick={() => start(lastPick)}>{t.retry}</button>
              )}
            </div>
          )}
        </div>
      </div>
      <ImagePickerDialog open={picking} onOpenChange={setPicking} onPick={(p) => void start(p)} />
    </div>
  );
}
