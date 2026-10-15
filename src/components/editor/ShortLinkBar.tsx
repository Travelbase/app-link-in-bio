import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backend } from "@/lib/linkinbio/backend";
import { uiText } from "@/lib/uiText";

const t = uiText.editor;
const BACK_HALF = /^[A-Za-z0-9_-]{3,50}$/;

/** The link that goes in the Instagram bio, with copy, open and (for a bit.ly link) a new back-half. */
export function ShortLinkBar({ url, pageId, queryKey }: { url: string; pageId?: string; queryKey: unknown[] }) {
  const qc = useQueryClient();
  const bitly = url.match(/^https:\/\/(bit\.ly)\/(.+)$/);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success(t.linkCopied); } catch { /* ignore */ }
  };
  const save = async () => {
    if (!pageId || !BACK_HALF.test(value)) return;
    setBusy(true);
    try {
      const next = await backend.renameShortLink(pageId, value);
      qc.setQueryData(queryKey, next);
      setEditing(false);
      toast.success(t.linkChanged);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5 text-sm">
      <span className="shrink-0 font-medium">{t.yourLink}</span>
      {editing && bitly ? (
        <form className="flex min-w-0 items-center gap-1" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <span className="shrink-0 text-muted-foreground">{bitly[1]}/</span>
          <Input autoFocus value={value} onChange={(e) => setValue(e.target.value.trim())} aria-label={t.linkName}
            aria-invalid={!BACK_HALF.test(value)} className="h-8 w-48" onKeyDown={(e) => e.key === "Escape" && setEditing(false)} />
          <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" disabled={busy || !BACK_HALF.test(value)} aria-label={t.saveLink}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(false)} aria-label={uiText.cancel}>
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary underline-offset-2 hover:underline">{url}</a>
          {bitly && pageId && (
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setValue(bitly[2]!); setEditing(true); }} aria-label={t.editLink}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="shrink-0" onClick={copy}><Copy className="h-3.5 w-3.5" />{t.copy}</Button>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" />{t.openPage}</a>
          </Button>
        </>
      )}
    </div>
  );
}
