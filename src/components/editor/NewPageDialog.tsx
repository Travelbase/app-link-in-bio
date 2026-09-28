import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Instagram, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPageFromTemplate, freeAddressFor, MARKETS } from "@/lib/linkinbio/api";
import { friendlyConnectError, newPageInstagram, waitForInstagramPopup, INSTAGRAM_POPUP_FEATURES } from "@/lib/linkinbio/instagram";
import { addressError, suggestAddress } from "@/lib/linkinbio/validation";
import type { Market } from "@/lib/linkinbio/types";
import { useAddressCheck } from "@/hooks/useAddressCheck";
import { uiText } from "@/lib/uiText";
import { TextField } from "./fields";

const t = uiText.editor;
const n = t.newPageDialog;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** One-time key from the Instagram login, when the dialog reopens after connecting. */
  pendingKey?: string | null;
  /** Error from a failed Instagram login. */
  connectError?: string | null;
}

export function NewPageDialog({ open, onOpenChange, pendingKey, connectError }: Props) {
  const [step, setStep] = useState<"connect" | "details">("connect");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [picture, setPicture] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [market, setMarket] = useState<Market>("NL");
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const check = useAddressCheck(address, undefined, !address && !addressTouched);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setHandle(""); setName(""); setAddress(""); setAddressTouched(false); setMarket("NL"); setPicture("");
    setWaiting(false); setConnecting(false); setError(connectError ? connectError : connectError === "" ? n.connectFailed : null);
    setKey(pendingKey ?? null);
    setStep("connect");
    newPageInstagram("configured").then((r) => setConfigured(!!r.configured)).catch(() => setConfigured(false));
    if (pendingKey) void autoCreate(pendingKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingKey, connectError]);

  /** After a successful Instagram login: create the page straight away from the Instagram profile (market NL). */
  const autoCreate = async (k: string) => {
    setLoadingProfile(true);
    try {
      const p = await newPageInstagram("pending_profile", k);
      setHandle(p.username);
      const addr = await freeAddressFor(p.username, suggestAddress, addressError);
      const page = await createPageFromTemplate({ handle: p.username, displayName: p.name || p.username, address: addr, market: "NL" });
      const r = await newPageInstagram("claim_pending", k, page.id);
      if (r.syncError) toast.error(t.instagram.syncError, { description: r.syncError });
      await qc.invalidateQueries({ queryKey: ["editor-pages"] });
      toast.success(n.createdFrom(p.username), { duration: 8000 });
      onOpenChange(false);
      navigate(`/edit/${page.address}`, { replace: true });
    } catch (e) {
      setKey(null); setStep("connect"); setError((e as Error).message || n.failed);
    } finally {
      setLoadingProfile(false);
    }
  };

  const connect = async () => {
    // Open the pop-up before the async call so popup blockers allow it.
    const popup = window.open("", "instagram-connect", INSTAGRAM_POPUP_FEATURES);
    setConnecting(true); setError(null);
    try {
      const { url } = await newPageInstagram("start_new");
      if (!url) throw new Error(n.connectFailed);
      if (!popup) { window.location.href = url; return; }
      setWaiting(true);
      const r = await waitForInstagramPopup(popup, url);
      setWaiting(false);
      if (r.status === "ok" && r.key) void autoCreate(r.key);
      else if (r.status === "error") setError(r.reason || n.connectFailed);
    } catch (e) {
      setWaiting(false);
      popup?.close();
      setError((e as Error).message || n.connectFailed);
    } finally {
      setConnecting(false);
    }
  };

  const onHandle = (v: string) => {
    const h = v.replace(/^@+/, "").trim();
    setHandle(h);
    if (!addressTouched) setAddress(suggestAddress(h));
  };

  const canCreate = handle && name.trim() && check.state === "ok" && !creating;

  const create = async () => {
    setCreating(true);
    try {
      const page = await createPageFromTemplate({ handle, displayName: name.trim(), address, market });
      if (key) {
        const r = await newPageInstagram("claim_pending", key, page.id);
        if (r.syncError) toast.error(t.instagram.syncError, { description: r.syncError });
      }
      await qc.invalidateQueries({ queryKey: ["editor-pages"] });
      toast.success(n.created);
      onOpenChange(false);
      navigate(`/edit/${page.address}`, { replace: true });
    } catch (e) {
      toast.error(n.failed, { description: (e as Error).message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {loadingProfile ? (
          <>
            <DialogHeader>
              <DialogTitle>{n.connectTitle}</DialogTitle>
              <DialogDescription>{n.autoCreating(handle || "…")}</DialogDescription>
            </DialogHeader>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{n.creating}</p>
          </>
        ) : step === "connect" ? (
          <>
            <DialogHeader>
              <DialogTitle>{n.connectTitle}</DialogTitle>
              <DialogDescription>{n.connectBody}</DialogDescription>
            </DialogHeader>
            {configured === false && <Alert><AlertDescription>{n.notConfigured}</AlertDescription></Alert>}
            {error && (() => { const fe = friendlyConnectError(error); return <Alert variant="destructive"><AlertDescription>{fe.message}{fe.detail && <span className="mt-1 block text-xs opacity-80">{fe.detail}</span>}</AlertDescription></Alert>; })()}
            {waiting && <Alert><AlertDescription>{n.waiting}</AlertDescription></Alert>}
            <div className="flex flex-col items-center gap-3 py-2">
              <Button onClick={() => void connect()} disabled={!configured || connecting}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
                {t.instagram.connect}
              </Button>
              <Button variant="link" onClick={() => { setKey(null); setStep("details"); }}>{n.skip}</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{n.detailsTitle}</DialogTitle>
              <DialogDescription>{n.description}</DialogDescription>
            </DialogHeader>
            {loadingProfile ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{n.loadingProfile}</p>
            ) : (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (canCreate) void create(); }}>
                {key && (
                  <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                    <Avatar className="h-12 w-12">
                      {picture && <AvatarImage src={picture} alt="" />}
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-medium">{n.connectedAs(handle)}</p>
                  </div>
                )}
                <TextField label={t.settings.displayName} value={name} onChange={setName} />
                <div className="space-y-1.5">
                  <Label htmlFor="new-handle">{t.settings.instagramHandle}</Label>
                  <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
                    <span className="pl-3 pr-1.5 text-sm text-muted-foreground" aria-hidden="true">@</span>
                    <Input id="new-handle" value={handle} className="border-0 pl-0 focus-visible:ring-0" placeholder="travelbase_nl" autoComplete="off"
                      onChange={(e) => onHandle(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-address">{t.settings.webAddress}</Label>
                  <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring">
                    <span className="pl-3 pr-1.5 text-sm text-muted-foreground">{window.location.host}/</span>
                    <Input id="new-address" value={address} className="border-0 pl-0 focus-visible:ring-0"
                      onChange={(e) => { setAddressTouched(true); setAddress(e.target.value.toLowerCase().trim()); }} />
                    <span className="pr-3">
                      {check.state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {check.state === "ok" && <Check className="h-4 w-4 text-primary" aria-label={t.settings.available} />}
                    </span>
                  </div>
                  {check.state === "error" && <p className="text-xs text-destructive">{check.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-market">{t.settings.market}</Label>
                  <Select value={market} onValueChange={(v) => setMarket(v as Market)}>
                    <SelectTrigger id="new-market" className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => { setKey(null); setStep("connect"); }}>{n.back}</Button>
                  <Button type="submit" disabled={!canCreate}>
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {creating ? n.creating : n.create}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
