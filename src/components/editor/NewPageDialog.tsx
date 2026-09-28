import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPageFromTemplate } from "@/lib/linkinbio/api";
import { suggestAddress } from "@/lib/linkinbio/validation";
import { useAddressCheck } from "@/hooks/useAddressCheck";
import { uiText } from "@/lib/uiText";
import { TextField } from "./fields";

const t = uiText.editor;

export function NewPageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const check = useAddressCheck(address, undefined, !address && !addressTouched);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (open) { setHandle(""); setName(""); setAddress(""); setAddressTouched(false); }
  }, [open]);

  const onHandle = (v: string) => {
    const h = v.replace(/^@+/, "").trim();
    setHandle(h);
    if (!addressTouched) setAddress(suggestAddress(h));
  };

  const canCreate = handle && name.trim() && check.state === "ok" && !creating;

  const create = async () => {
    setCreating(true);
    try {
      const addr = await createPageFromTemplate({ handle, displayName: name.trim(), address });
      await qc.invalidateQueries({ queryKey: ["editor-pages"] });
      toast.success(t.newPageDialog.created);
      onOpenChange(false);
      navigate(`/edit/${addr}`);
    } catch (e) {
      toast.error(t.newPageDialog.failed, { description: (e as Error).message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.newPageDialog.title}</DialogTitle>
          <DialogDescription>{t.newPageDialog.description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (canCreate) void create(); }}>
          <TextField label={t.settings.instagramHandle} hint={t.settings.handleHint} value={handle} onChange={onHandle} placeholder="travelbase_nl" />
          <TextField label={t.settings.displayName} value={name} onChange={setName} />
          <div className="space-y-1.5">
            <Label htmlFor="new-address">{t.settings.webAddress}</Label>
            <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
              <span className="pl-3 text-sm text-muted-foreground">{window.location.host}/</span>
              <Input id="new-address" value={address} className="border-0 pl-0.5 focus-visible:ring-0"
                onChange={(e) => { setAddressTouched(true); setAddress(e.target.value.toLowerCase().trim()); }} />
              <span className="pr-3">
                {check.state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {check.state === "ok" && <Check className="h-4 w-4 text-primary" aria-label={t.settings.available} />}
              </span>
            </div>
            {check.state === "error" && <p className="text-xs text-destructive">{check.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={!canCreate}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? t.newPageDialog.creating : t.newPageDialog.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
