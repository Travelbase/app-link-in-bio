import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
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
}

export function BlockEditSheet({ block, onClose, onChange }: Props) {
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
              <BlockFields block={block} onChange={onChange} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BlockFields({ block, onChange }: { block: BlockData; onChange: (c: BlockData["content"]) => void }) {
  switch (block.type) {
    case "profile": {
      const c = block.content;
      const set = (p: Partial<BlockContentMap["profile"]>) => onChange({ ...c, ...p });
      return (
        <>
          <ImageUpload label={f.avatar} value={c.avatar_url} onChange={(avatar_url) => set({ avatar_url })} />
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{f.igSyncNote}</AlertDescription>
          </Alert>
          <UrlField label={f.defaultLink} value={c.default_url} onChange={(default_url) => onChange({ ...c, default_url })} />
          <ListEditor
            label={f.posts}
            items={c.posts}
            onChange={(posts) => onChange({ ...c, posts })}
            makeItem={(): GridPost => ({ image_url: "" })}
            addLabel={f.addPost}
            itemTitle={(n) => f.post(n)}
            renderFields={(post, update) => (
              <>
                <ImageUpload compact value={post.image_url} onChange={(image_url) => update({ image_url })} />
                <UrlField label={f.postLink} optional hint={f.postLinkHint} value={post.url} onChange={(url) => update({ url: url || undefined })} />
                <div className="flex flex-wrap gap-4">
                  <SwitchField label={f.hidden} checked={!!post.is_hidden} onChange={(is_hidden) => update({ is_hidden })} />
                  <SwitchField label={f.video} checked={!!post.is_video} onChange={(is_video) => update({ is_video })} />
                  <SwitchField label={f.multiple} checked={!!post.has_multiple} onChange={(has_multiple) => update({ has_multiple })} />
                </div>
              </>
            )}
          />
        </>
      );
    }
  }
}
