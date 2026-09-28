import { useState, type ReactNode } from "react";
import { ArrowUpDown, Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BlockData } from "@/lib/linkinbio/types";
import { ADDABLE_BLOCKS, BLOCK_ICONS, newBlock } from "@/lib/linkinbio/presets";
import { blockSummary, isBlockComplete } from "@/lib/linkinbio/validation";
import { uiText } from "@/lib/uiText";
import { SortableList } from "./SortableList";
import { BlockEditSheet } from "./BlockEditSheet";

const t = uiText.editor;

interface Props {
  blocks: BlockData[];
  pageId?: string;
  setBlocks: (fn: (prev: BlockData[]) => BlockData[]) => void;
}

export function BlocksTab({ blocks, setBlocks, pageId }: Props) {
  const [ordering, setOrdering] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const profile = blocks.find((b) => b.type === "profile");
  const rest = blocks.filter((b) => b.type !== "profile");
  const editing = blocks.find((b) => b.id === editingId) ?? null;

  const update = (id: string, patch: Partial<BlockData>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as BlockData) : b)));

  const duplicate = (id: string) =>
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const copy = { ...structuredClone(prev[i]), id: crypto.randomUUID() };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });

  const add = (type: (typeof ADDABLE_BLOCKS)[number]) => {
    const b = newBlock(type, blocks.length);
    setBlocks((prev) => [...prev, b]);
    setEditingId(b.id!);
  };

  const row = (b: BlockData, handle?: ReactNode) => {
    const Icon = BLOCK_ICONS[b.type];
    const isProfile = b.type === "profile";
    const summary = blockSummary(b);
    return (
      <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
        {ordering && (handle ?? <span className="w-6" />)}
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {t.blockTypes[b.type].name}
            {summary && <span className="font-normal text-muted-foreground"> · {summary}</span>}
          </p>
          {!isBlockComplete(b) && <Badge variant="outline" className="mt-0.5 border-amber-400 text-amber-700 text-[10px] px-1.5 py-0">{t.incomplete}</Badge>}
        </div>
        {!ordering && (
          <>
            {!isProfile && (
              <Switch checked={b.is_visible} onCheckedChange={(v) => update(b.id!, { is_visible: v })} aria-label={t.toggleVisible} />
            )}
            <Button size="sm" variant="outline" onClick={() => setEditingId(b.id!)}>{t.edit}</Button>
            {!isProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t.moreActions}><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => duplicate(b.id!)}>{t.duplicate}</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingId(b.id!)}>{t.delete}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : <span className="w-8" />}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.myBlocks}</h2>
          <Button size="sm" variant={ordering ? "default" : "outline"} onClick={() => setOrdering((o) => !o)}>
            {ordering ? <Check className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />}
            {ordering ? t.done : t.changeOrder}
          </Button>
        </div>
        <div className="space-y-2">
          {profile && row(profile)}
          {ordering ? (
            <SortableList
              items={rest}
              getId={(b) => b.id!}
              onReorder={(items) => setBlocks(() => (profile ? [profile, ...items] : items))}
              className="space-y-2"
              renderItem={(b, _i, { handle }) => row(b, handle)}
            />
          ) : (
            rest.map((b) => <div key={b.id}>{row(b)}</div>)
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.addMoreBlocks}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ADDABLE_BLOCKS.map((type) => {
            const Icon = BLOCK_ICONS[type];
            return (
              <div key={type} className="flex items-start gap-3 rounded-md border bg-card p-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.blockTypes[type].name}</p>
                  <p className="text-xs text-muted-foreground">{t.blockTypes[type].description}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => add(type)}>{t.add}</Button>
              </div>
            );
          })}
        </div>
      </section>

      <BlockEditSheet
        pageId={pageId}
        block={editing}
        onClose={() => setEditingId(null)}
        onChange={(content) => editing && update(editing.id!, { content } as Partial<BlockData>)}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteBlockTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteBlockBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setBlocks((prev) => prev.filter((b) => b.id !== deletingId)); setDeletingId(null); }}
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
