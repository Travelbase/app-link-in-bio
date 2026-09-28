import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import { instagramAction, updateSyncedPost, type SyncedPost } from "@/lib/linkinbio/instagram";
import type { BlockContentMap, BlockData, GridPost, SocialPlatform } from "@/lib/linkinbio/types";
import { uiText } from "@/lib/uiText";
import { ImageUpload } from "./ImageUpload";
import { ListEditor, SwitchField, TextField, UrlField } from "./fields";

const t = uiText.editor;
const f = t.fields;
const PLATFORMS = Object.keys(t.platforms) as SocialPlatform[];

interface Props {
  block: BlockData | null;
  onClose: () => void;
  onChange: (content: BlockData["content"]) => void;
  pageId?: string;
}

export function BlockEditSheet({ block, onClose, onChange, pageId }: Props) {
  return (
    <Sheet open={!!block} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {block && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>{t.blockTypes[block.type].name}</SheetTitle>
              <SheetDescription>{t.editSheetDesc}</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 pb-8">
              <BlockFields block={block} onChange={onChange} pageId={pageId} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BlockFields({ block, onChange, pageId }: { block: BlockData; onChange: (c: BlockData["content"]) => void; pageId?: string }) {
  switch (block.type) {
    case "profile": {
      const c = block.content;
      const set = (p: Partial<BlockContentMap["profile"]>) => onChange({ ...c, ...p });
      return (
        <>
          <ImageUpload label={f.avatar} value={c.avatar_url} onChange={(avatar_url) => set({ avatar_url, avatar_custom: true })} />
          <TextField label={f.name} value={c.name} onChange={(name) => set({ name })} error={!c.name?.trim() ? f.required : null} />
          <TextField label={f.tagline} value={c.tagline} onChange={(tagline) => set({ tagline })} />
        </>
      );
    }
    case "social_icons": {
      const c = block.content;
      return (
        <ListEditor
          label={f.links}
          items={c.items}
          onChange={(items) => onChange({ ...c, items })}
          makeItem={() => ({ platform: "instagram" as SocialPlatform, url: "https://" })}
          addLabel={f.addLink}
          itemTitle={(n) => f.item(n)}
          renderFields={(item, update) => (
            <>
              <div className="space-y-1.5">
                <Label>{f.platform}</Label>
                <Select value={item.platform} onValueChange={(v) => update({ platform: v as SocialPlatform })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{t.platforms[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <UrlField
                label={f.urlOrEmail}
                value={item.url}
                onChange={(url) => update({ url })}
                onBlur={() => {
                  if (item.platform === "email" && item.url && !item.url.startsWith("mailto:") && item.url.includes("@"))
                    update({ url: `mailto:${item.url}` });
                }}
              />
            </>
          )}
        />
      );
    }
    case "button": {
      const c = block.content;
      return (
        <>
          <TextField label={f.label} value={c.label} onChange={(label) => onChange({ ...c, label })} error={!c.label?.trim() ? f.required : null} />
          <UrlField label={f.url} value={c.url} onChange={(url) => onChange({ ...c, url })} />
        </>
      );
    }
    case "button_group": {
      const c = block.content;
      return (
        <>
          <TextField label={f.groupLabel} value={c.label} onChange={(label) => onChange({ ...c, label })} error={!c.label?.trim() ? f.required : null} />
          <ListEditor
            label={f.links}
            items={c.items}
            onChange={(items) => onChange({ ...c, items })}
            makeItem={() => ({ label: "", url: "https://" })}
            addLabel={f.addLink}
            itemTitle={(n) => f.item(n)}
            renderFields={(item, update) => (
              <>
                <TextField label={f.label} value={item.label} onChange={(label) => update({ label })} />
                <UrlField label={f.url} value={item.url} onChange={(url) => update({ url })} />
              </>
            )}
          />
        </>
      );
    }
    case "featured_banner": {
      const c = block.content;
      const set = (p: Partial<BlockContentMap["featured_banner"]>) => onChange({ ...c, ...p });
      return (
        <>
          <ImageUpload label={f.image} value={c.image_url} onChange={(image_url) => set({ image_url })} />
          <TextField label={f.title} value={c.title} onChange={(title) => set({ title })} error={!c.title?.trim() ? f.required : null} />
          <TextField label={f.subtitle} value={c.subtitle} onChange={(subtitle) => set({ subtitle })} />
          <TextField label={f.buttonLabel} value={c.button_label} onChange={(button_label) => set({ button_label })} />
          <UrlField label={f.url} value={c.url} onChange={(url) => set({ url })} />
        </>
      );
    }
    case "carousel": {
      const c = block.content;
      return (
        <ListEditor
          label={f.items}
          items={c.items}
          onChange={(items) => onChange({ ...c, items })}
          makeItem={() => ({ image_url: "", title: "", subtitle: "", url: "https://" })}
          addLabel={f.addItem}
          itemTitle={(n) => f.item(n)}
          renderFields={(item, update) => (
            <>
              <ImageUpload compact value={item.image_url} onChange={(image_url) => update({ image_url })} />
              <TextField label={f.title} value={item.title} onChange={(title) => update({ title })} />
              <TextField label={f.subtitle} value={item.subtitle} onChange={(subtitle) => update({ subtitle })} />
              <UrlField label={f.url} value={item.url} onChange={(url) => update({ url })} />
            </>
          )}
        />
      );
    }
    case "instagram_grid": {
      const c = block.content;
      return (
        <>
          <InstagramStatus pageId={pageId} />
          <UrlField label={f.defaultLink} value={c.default_url} onChange={(default_url) => onChange({ ...c, default_url })} />
          <ManualPosts pageId={pageId} content={c} onChange={onChange} />
        </>
      );
    }
  }
}

function useConnection(pageId?: string) {
  return useQuery({ queryKey: ["instagram-status", pageId], queryFn: () => instagramAction("status", pageId ?? ""), enabled: !!pageId, refetchOnWindowFocus: true });
}

function InstagramStatus({ pageId }: { pageId?: string }) {
  const qc = useQueryClient();
  const status = useConnection(pageId);
  const [busy, setBusy] = useState(false);
  const connection = status.data?.connection;
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get('instagram');
    if (!result) return;
    if (result === 'connected') toast.success(t.instagram.connectedNotice);
    else toast.error(url.searchParams.get('reason') || t.instagram.connectionError);
    url.searchParams.delete('instagram'); url.searchParams.delete('reason');
    window.history.replaceState(window.history.state, '', url.toString());
    void status.refetch();
    void qc.invalidateQueries({ queryKey: ['instagram-feed', pageId] });
  }, [pageId]);
  const act = async (action: 'start' | 'sync' | 'disconnect') => {
    if (!pageId || busy) return;
    if (action === 'disconnect' && !window.confirm(t.instagram.confirmDisconnect)) return;
    setBusy(true);
    // Instagram refuses to load inside the editor preview frame, so open login in a new tab (opened now to avoid popup blockers).
    const popup = action === 'start' ? window.open('', '_blank') : null;
    try {
      const result = await instagramAction(action, pageId);
      if (action === 'start' && result.url) { if (popup) popup.location.href = result.url; else window.location.assign(result.url); return; }
      await Promise.all([status.refetch(), qc.invalidateQueries({ queryKey: ['instagram-feed', pageId] })]);
    } catch (error) { popup?.close(); toast.error(error instanceof Error ? error.message : t.instagram.actionError); }
    finally { setBusy(false); }
  };
  return <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
    {status.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : status.isError ? <p className="text-destructive">{t.instagram.statusError}</p> : !status.data?.configured ? <p>{t.instagram.setupMissing}</p> : connection ? <>
      <p className="font-medium">{t.instagram.connected(connection.username, connection.last_synced_at ? formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true }) : t.instagram.neverSynced)}</p>
      {connection.last_error && <p className="text-destructive">{t.instagram.syncError} {connection.last_error}</p>}
    </> : null}
    <div className="flex flex-wrap gap-2">
      {!connection ? <Button size="sm" disabled={!status.data?.configured || busy} onClick={() => void act('start')}>{t.instagram.connect}</Button> : <>
        <Button size="sm" disabled={busy} onClick={() => void act('sync')}>{busy ? t.instagram.syncing : t.instagram.sync}</Button>
        {connection.last_error && <Button size="sm" variant="outline" disabled={busy} onClick={() => void act('start')}>{t.instagram.reconnect}</Button>}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void act('disconnect')}>{t.instagram.disconnect}</Button>
      </>}
    </div>
  </div>;
}

function ManualPosts({ pageId, content, onChange }: { pageId?: string; content: BlockContentMap['instagram_grid']; onChange: (c: BlockData['content']) => void }) {
  const status = useConnection(pageId);
  const feed = useQuery({ queryKey: ['instagram-feed', pageId], queryFn: async () => {
    const { getFeed } = await import('@/lib/linkinbio/instagram');
    return getFeed(pageId ?? '');
  }, enabled: !!pageId && !!status.data?.connection });
  if (status.data?.connection) return <div className="space-y-3">
    <FieldLabel>{f.posts}</FieldLabel>
    {feed.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : feed.isError ? <p className="text-destructive">{t.instagram.statusError}</p> : (feed.data ?? []).map((post) => <SyncedPostRow key={post.id} post={post} pageId={pageId} />)}
  </div>;
  return <>
    <Alert><Info className="h-4 w-4" /><AlertDescription>{f.igSyncNote}</AlertDescription></Alert>
    <ListEditor label={f.posts} items={content.posts} onChange={(posts) => onChange({ ...content, posts })}
      makeItem={(): GridPost => ({ image_url: '' })} addLabel={f.addPost} itemTitle={(n) => f.post(n)}
      renderFields={(post, update) => <>
        <ImageUpload compact value={post.image_url} onChange={(image_url) => update({ image_url })} />
        <UrlField label={f.postLink} optional hint={f.postLinkHint} value={post.url} onChange={(url) => update({ url: url || undefined })} />
        <div className="flex flex-wrap gap-4">
          <SwitchField label={f.hidden} checked={!!post.is_hidden} onChange={(is_hidden) => update({ is_hidden })} />
          <SwitchField label={f.video} checked={!!post.is_video} onChange={(is_video) => update({ is_video })} />
          <SwitchField label={f.multiple} checked={!!post.has_multiple} onChange={(has_multiple) => update({ has_multiple })} />
        </div>
      </>} />
  </>;
}

function SyncedPostRow({ post, pageId }: { post: SyncedPost; pageId?: string }) {
  const qc = useQueryClient();
  const [link, setLink] = useState(post.link_url);
  const [saving, setSaving] = useState(false);
  useEffect(() => setLink(post.link_url), [post.link_url]);
  const save = async (patch: { link_url?: string; is_hidden?: boolean }) => {
    setSaving(true);
    try { await updateSyncedPost(post.id, patch); await qc.invalidateQueries({ queryKey: ['instagram-feed', pageId] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : t.instagram.actionError); }
    finally { setSaving(false); }
  };
  return <div className="flex gap-3 border-b pb-3">
    <img src={post.image_url} alt={post.caption || uiText.instagramPost} className="h-16 w-16 shrink-0 object-cover rounded" />
    <div className="min-w-0 flex-1 space-y-2">
      <p className="truncate text-sm">{post.caption || uiText.instagramPost}</p>
      <p className="text-xs text-muted-foreground">{new Date(post.posted_at).toLocaleDateString()}</p>
      <UrlField label={f.postLink} optional value={link} onChange={setLink} hint={t.instagram.defaultPlaceholder} onBlur={() => { if (link !== post.link_url) void save({ link_url: link }); }} />
      <SwitchField label={f.hidden} checked={post.is_hidden} onChange={(is_hidden) => void save({ is_hidden })} />
      {saving && <Loader2 className="h-3 w-3 animate-spin" />}
    </div>
  </div>;
}
