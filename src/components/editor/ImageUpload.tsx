import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { MAX_IMAGE_BYTES, uploadImage } from "@/lib/linkinbio/api";
import { uiText } from "@/lib/uiText";

const t = uiText.editor.upload;

interface Props {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  compact?: boolean;
}

export function ImageUpload({ label, value, onChange, compact }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const start = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) return setError(t.notImage);
    if (file.size > MAX_IMAGE_BYTES) return setError(t.tooBig);
    setLastFile(file);
    setProgress(0);
    try {
      const url = await uploadImage(file, setProgress);
      onChange(url);
      setLastFile(null);
    } catch {
      setError(t.failed);
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
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => input.current?.click()}>
            {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {uploading ? t.uploading : value ? t.replace : t.upload}
          </Button>
          {uploading && <Progress value={progress} className="h-1.5" />}
          {!compact && !uploading && <p className="text-xs text-muted-foreground">{t.hint}</p>}
          {error && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-destructive" role="alert">
              <span>{error}</span>
              {lastFile && error === t.failed && (
                <button type="button" className="underline" onClick={() => start(lastFile)}>{t.retry}</button>
              )}
            </div>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void start(f);
        }}
      />
    </div>
  );
}
