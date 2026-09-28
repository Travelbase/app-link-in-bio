import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Market, PageData } from "@/lib/linkinbio/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MARKETS } from "@/lib/linkinbio/api";
import { deletePage } from "@/lib/linkinbio/api";
import { utmSourceFor, UTM_MEDIUM } from "@/lib/linkinbio/utm";
import { useAddressCheck } from "@/hooks/useAddressCheck";
import { uiText } from "@/lib/uiText";
import { TextField } from "./fields";

const t = uiText.editor.settings;

interface Props {
  page: PageData;
  savedAddress: string;
  update: (patch: Partial<PageData>) => void;
}

export function SettingsTab({ page, savedAddress, update }: Props) {
  const [address, setAddress] = useState(page.address);
  const check = useAddressCheck(address, page.id, address === page.address && address === savedAddress);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Only commit a new address to the page once it's valid and free.
  useEffect(() => {
    if (check.state === "ok" && address !== page.address) update({ address });
  }, [check.state, address, page.address, update]);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deletePage(page.id!);
      toast.success(t.deleted);
      await qc.invalidateQueries({ queryKey: ["editor-pages"] });
      navigate("/", { replace: true });
    } catch {
      toast.error(t.deleteFailed);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-md border bg-card p-4 space-y-4">
        <TextField label={t.displayName} value={page.display_name} onChange={(display_name) => update({ display_name })} />
        <TextField label={t.instagramHandle} hint={t.handleHint} value={page.instagram_handle}
          onChange={(v) => update({ instagram_handle: v.replace(/^@+/, "").trim() })} />
        <div className="space-y-1.5">
          <Label htmlFor="settings-market">{t.market}</Label>
          <Select value={page.market ?? "NL"} onValueChange={(v) => update({ market: v as Market })}>
            <SelectTrigger id="settings-market" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-address">{t.webAddress}</Label>
          <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
            <span className="pl-3 text-sm text-muted-foreground">{window.location.host}/</span>
            <Input id="settings-address" value={address} className="border-0 pl-0.5 focus-visible:ring-0"
              onChange={(e) => setAddress(e.target.value.toLowerCase().trim())} aria-invalid={check.state === "error"} />
            <span className="pr-3">
              {check.state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t.checking} />}
              {check.state === "ok" && <Check className="h-4 w-4 text-primary" aria-label={t.available} />}
            </span>
          </div>
          {check.state === "error" && <p className="text-xs text-destructive">{check.message}</p>}
          {address !== savedAddress && check.state !== "error" && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 !text-amber-600" />
              <AlertDescription>{t.addressChangeWarning}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      <section className="rounded-md border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold">{t.tracking}</h2>
        <p className="text-sm text-muted-foreground">{t.trackingNote}</p>
        <code className="block overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
          utm_source={utmSourceFor(page.address)}<br />utm_medium={UTM_MEDIUM}
        </code>
      </section>

      <section className="rounded-md border border-destructive/40 bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-destructive">{t.dangerZone}</h2>
        <p className="text-sm text-muted-foreground">{t.deletePageBody}</p>
        <Button variant="destructive" size="sm" onClick={() => { setConfirm(""); setDeleteOpen(true); }}>{t.deletePage}</Button>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deletePage}</DialogTitle>
            <DialogDescription>{t.deletePageBody}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">{t.deleteConfirmLabel(savedAddress)}</Label>
            <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{uiText.editor.cancel}</Button>
            <Button variant="destructive" disabled={confirm !== savedAddress || deleting} onClick={onDelete}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}{t.deletePage}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
